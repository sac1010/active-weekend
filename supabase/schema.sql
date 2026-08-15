        -- ========================================================
        -- ACTIVEWEEKEND: PRODUCTION DATABASE SCHEMA & SECURITY POLICIES
        -- ========================================================

        -- 1. Create Profiles Table (Syncs with Supabase Auth users)
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE NOT NULL,
            avatar_url TEXT,
            trust_points INTEGER DEFAULT 150 CONSTRAINT check_minimum_points CHECK (trust_points >= 0),
            successful_hostings INTEGER DEFAULT 0 CONSTRAINT positive_hostings CHECK (successful_hostings >= 0),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- 2. Create Events Table
        CREATE TABLE public.events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            activity_type TEXT NOT NULL, -- 'Badminton', 'Pickleball', 'Board Games', etc.
            locality TEXT NOT NULL,      -- 'HSR Layout', 'Indiranagar', etc.
            venue_name TEXT NOT NULL,
            event_date DATE NOT NULL,
            event_time TEXT NOT NULL,    -- '7:00 AM - 9:00 AM'
            skill_level TEXT NOT NULL,   -- 'Beginner', 'Intermediate', 'Advanced'
            max_slots INTEGER NOT NULL CONSTRAINT valid_slots CHECK (max_slots >= 2),
            cost_type TEXT NOT NULL CHECK (cost_type IN ('Free', 'Split', 'Paid')),
            cost_value INTEGER DEFAULT 0 CONSTRAINT positive_cost CHECK (cost_value >= 0),
            description TEXT NOT NULL,
            photo_url TEXT,              -- Link to verified group photo in Supabase Storage
            status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Completed', 'Cancelled')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- 3. Create Bookings Table (Roster registrations)
        CREATE TABLE public.bookings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Escrow_Held', 'Released', 'Refunded')),
            payment_ref TEXT, -- UTR number or Razorpay payment ID
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            CONSTRAINT unique_booking UNIQUE (event_id, user_id)
        );

        -- 4. Create Chats Table (Coordination thread)
        CREATE TABLE public.chats (
            id BIGSERIAL PRIMARY KEY,
            event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- 5. Create TrustPoints Ledger Table (Financial audit trail)
        CREATE TABLE public.trust_points_ledger (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Host_Reward', 'Join_Reward', 'Refund', 'Penalty')),
            event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- 6. Create Notifications Table (In-app alerts)
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- ========================================================
        -- INDEXES FOR MAXIMUM LOCAL QUERY OPTIMIZATION
        -- ========================================================
        CREATE INDEX idx_events_search ON public.events (locality, activity_type, event_date) WHERE status = 'Open';
        CREATE INDEX idx_bookings_lookup ON public.bookings (event_id, user_id);
        CREATE INDEX idx_chats_timeline ON public.chats (event_id, created_at ASC);
        CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read);

        -- ========================================================
        -- SECURITY TRIGGERS & PL/pgSQL LOGIC
        -- ========================================================

        -- Trigger Function A: Sync auth.users with public.profiles on signup
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.profiles (id, username, avatar_url, trust_points, successful_hostings)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'User_' || substr(NEW.id::text, 1, 8)),
                COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id::text),
                150,
                0
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE TRIGGER trigger_on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();


        -- Trigger Function B: Prevent Roster Overbooking (Race Conditions)
        CREATE OR REPLACE FUNCTION public.check_bookings_limit()
        RETURNS TRIGGER AS $$
        DECLARE
            slots_count INTEGER;
            max_allowed INTEGER;
        BEGIN
            -- Count current active bookings (exclude refunded/cancelled ones)
            SELECT COUNT(*) INTO slots_count 
            FROM public.bookings 
            WHERE event_id = NEW.event_id AND payment_status != 'Refunded';
            
            -- Get maximum slots allowed
            SELECT max_slots INTO max_allowed 
            FROM public.events 
            WHERE id = NEW.event_id;
            
            IF slots_count >= max_allowed THEN
                RAISE EXCEPTION 'Squad roster is already full!';
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_before_booking_inserted
            BEFORE INSERT ON public.bookings
            FOR EACH ROW
            EXECUTE FUNCTION public.check_bookings_limit();


        -- Trigger Function C: Enforce Host Validation & Price Locks on Update
        CREATE OR REPLACE FUNCTION public.validate_event_update()
        RETURNS TRIGGER AS $$
        DECLARE
            bookings_count INTEGER;
            host_successful_hostings INTEGER;
        BEGIN
            -- Check if host is upgrading to Paid
            IF NEW.cost_type = 'Paid' AND OLD.cost_type != 'Paid' THEN
                SELECT successful_hostings INTO host_successful_hostings FROM public.profiles WHERE id = NEW.host_id;
                IF host_successful_hostings < 3 THEN
                    RAISE EXCEPTION 'Host must have at least 3 successful hostings to host paid events.';
                END IF;
            END IF;

            -- Block price/cost type changes if guests have already booked
            SELECT COUNT(*) INTO bookings_count FROM public.bookings WHERE event_id = NEW.id;
            IF bookings_count > 0 AND (NEW.cost_type != OLD.cost_type OR NEW.cost_value != OLD.cost_value) THEN
                RAISE EXCEPTION 'Cannot modify cost type or pricing once users have booked into the roster.';
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_before_event_updated
            BEFORE UPDATE ON public.events
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_event_update();


        -- Trigger Function D: Process Event Completion & Disburse TrustPoints (Anti-Cheat)
        CREATE OR REPLACE FUNCTION public.handle_event_completion()
        RETURNS TRIGGER AS $$
        DECLARE
            attendee_record RECORD;
            today_payouts_count INTEGER;
        BEGIN
            -- Only run if status transitioned from 'Open' to 'Completed'
            IF NEW.status = 'Completed' AND OLD.status = 'Open' THEN
                
                -- 1. Credit Organizer: Increment successful hostings and grant 30 points (enforce daily cap)
                SELECT COUNT(*) INTO today_payouts_count 
                FROM public.trust_points_ledger 
                WHERE user_id = NEW.host_id AND transaction_type = 'Host_Reward' AND created_at >= NOW() - INTERVAL '1 day';

                UPDATE public.profiles 
                SET successful_hostings = successful_hostings + 1
                WHERE id = NEW.host_id;

                IF today_payouts_count = 0 THEN
                    UPDATE public.profiles 
                    SET trust_points = trust_points + 30
                    WHERE id = NEW.host_id;

                    INSERT INTO public.trust_points_ledger (user_id, amount, transaction_type, event_id)
                    VALUES (NEW.host_id, 30, 'Host_Reward', NEW.id);
                    
                    -- Insert notification to host
                    INSERT INTO public.notifications (user_id, title, message)
                    VALUES (NEW.host_id, 'Event Completed! 🎉', 'You have successfully hosted "' || NEW.title || '" and earned 30 TrustPoints!');
                ELSE
                    -- Notify host they reached cap but hosting count updated
                    INSERT INTO public.notifications (user_id, title, message)
                    VALUES (NEW.host_id, 'Event Completed! 🎉', 'You successfully hosted "' || NEW.title || '". (Daily TrustPoints cap reached, no points added)');
                END IF;

                -- 2. Credit Attendees: Grant 10 TrustPoints to all verified joined squad members (except the host)
                FOR attendee_record IN 
                    SELECT user_id FROM public.bookings WHERE event_id = NEW.id AND user_id != NEW.host_id
                LOOP
                    -- Check daily cap for attendee join rewards
                    SELECT COUNT(*) INTO today_payouts_count 
                    FROM public.trust_points_ledger 
                    WHERE user_id = attendee_record.user_id AND transaction_type = 'Join_Reward' AND created_at >= NOW() - INTERVAL '1 day';

                    IF today_payouts_count = 0 THEN
                        UPDATE public.profiles 
                        SET trust_points = trust_points + 10
                        WHERE id = attendee_record.user_id;

                        INSERT INTO public.trust_points_ledger (user_id, amount, transaction_type, event_id)
                        VALUES (attendee_record.user_id, 10, 'Join_Reward', NEW.id);

                        INSERT INTO public.notifications (user_id, title, message)
                        VALUES (attendee_record.user_id, 'Match Completed! 🏸', 'Thanks for playing in "' || NEW.title || '"! You earned 10 TrustPoints!');
                    ELSE
                        INSERT INTO public.notifications (user_id, title, message)
                        VALUES (attendee_record.user_id, 'Match Completed! 🏸', 'Thanks for playing in "' || NEW.title || '"! (Daily TrustPoints cap reached)');
                    END IF;
                    
                    -- Release Escrow: Update payment status to Released
                    UPDATE public.bookings 
                    SET payment_status = 'Released'
                    WHERE event_id = NEW.id AND user_id = attendee_record.user_id;
                END LOOP;
                
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE TRIGGER trigger_on_event_completed
            AFTER UPDATE ON public.events
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_event_completion();

        -- ========================================================
        -- ROW LEVEL SECURITY (RLS) POLICIES
        -- ========================================================
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.trust_points_ledger ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

        -- Profiles Policies
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
            FOR SELECT USING (true);
        CREATE POLICY "Users can edit their own profile details" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);

        -- Events Policies
        CREATE POLICY "Anyone can view open events" ON public.events
            FOR SELECT USING (status = 'Open' OR auth.uid() = host_id);
        CREATE POLICY "Logged in users can host events" ON public.events
            FOR INSERT WITH CHECK (auth.uid() = host_id);
        CREATE POLICY "Hosts can update/complete their own events" ON public.events
            FOR UPDATE USING (auth.uid() = host_id);

        -- Bookings Policies
        CREATE POLICY "Squad members can view roster" ON public.bookings
            FOR SELECT USING (true);
        CREATE POLICY "Logged in users can book themselves" ON public.bookings
            FOR INSERT WITH CHECK (
                auth.uid() = user_id AND 
                (SELECT trust_points FROM public.profiles WHERE id = auth.uid()) >= 50
            );
        CREATE POLICY "Users can cancel their own bookings" ON public.bookings
            FOR DELETE USING (auth.uid() = user_id);

        -- Chats Policies
        CREATE POLICY "Squad members can read chat" ON public.chats
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.bookings 
                    WHERE event_id = chats.event_id AND user_id = auth.uid()
                )
            );
        CREATE POLICY "Joined users can post chat messages" ON public.chats
            FOR INSERT WITH CHECK (
                auth.uid() = user_id AND
                EXISTS (
                    SELECT 1 FROM public.bookings 
                    WHERE event_id = chats.event_id AND user_id = auth.uid()
                )
            );

        -- Notifications Policies
        CREATE POLICY "Users can view their own notifications" ON public.notifications
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update their own notifications" ON public.notifications
            FOR UPDATE USING (auth.uid() = user_id);
