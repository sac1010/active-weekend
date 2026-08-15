# ActiveWeekend: Master Blueprint & Production Specification (v1.1)

ActiveWeekend is a premium, hyper-local sports, fitness, and hobby matchmaking web application designed specifically for Bangalore. It enables residents to find partners and join squads for badminton, pickleball, board games, running, and trekking.

This master blueprint contains the complete technical architecture, user flow specifications, database schemas, payment pipelines, and security protocols needed to build the app end-to-end.

---

## 1. Product Features & User Experience (UX) Specification

To ensure a seamless, confusion-free user experience, the application follows a high-hierarchy, clean interaction model:

```
[Explore Grid] ──> [Filter Panel] ──> [Details Drawer] ──> [RSVP/Secure Pay] ──> [Match Group Chat]
```

### A. The Landing & Navigation Interface
* **Header Bar:** Shows a brand logo, a city indicator ("Bangalore"), a TrustPoints counter (`🤝 X TrustPoints`), and a gamification badge indicating the user's host level progress (`🏆 Y/3 Hosts`).
* **Interactive Navigation Tabs:** 
  1. **Explore Plans:** The main public listing of upcoming weekend matches.
  2. **My Scheduled Games:** A dashboard for joined events showing personal schedules.
  3. **My Hosted Events:** A private list for organizers to manage, cancel, or complete games.
* **The Listing Grid:** Cards display the sport category, locality (e.g., "HSR Layout"), venue name, time/date, host avatar, split/pricing model tags (Free, Split, Paid), and a visual **Squad Slot Tracker** (colored circles displaying how many spots are left, removing all text clutter).

### B. The Host Session Form (Modal)
* **Visual Lock on Pricing:** When a user opens the host modal, the "Paid Event" select option is disabled and locked. A badge explaining the requirement is visible: *"Host 3 successful free events to unlock paid ticketing."*
* Once the user's account records `successful_hostings >= 3`, the option is unlocked programmatically.
* **Form Inputs:** Category, Title, Locality select (prepopulated with Bengaluru locations), Exact Venue Address (free-text), Date picker, Time slots (e.g., 7-9 AM), Max slots count, Cost type selector (Free/Split/Paid), Ticket Price input (shows conditionally), and Session Notes.
* **Price Freeze Safeguard:** Once the event is created and the first attendee joins, editing the cost type or pricing is completely blocked.

### C. Details Drawer (Dynamic Side Panel)
Clicking a card slides in a detailed overview containing:
* Detailed session notes (racket requirements, non-marking shoes rules).
* Roster grid listing current squad members with avatar images and empty spots.
* Contextual CTA Buttons:
  * Guest joins: `[Confirm & Join Squad]` (Free) / `[Join (Pay ₹X)]` (Paid checkout redirect).
  * Guest leaves: `[Leave Squad Roster]`.
  * Host view: `[Mark Event Completed & Disburse TrustPoints]` (Triggers verification and payouts).
* **Roster Discussion Board:** A live real-time chat section for coordinates. Includes auto-scroll to bottom.

---

## 2. Technical Stack Architecture (Zero-Cost Focus)

* **Frontend Framework:** Next.js (React) hosted on **Vercel** (Free Tier). Using **Server-Side Rendering (SSR)** for SEO optimization.
* **Database & Authentication:** **Supabase** (Postgres Free Tier) using Supabase Auth (Google OAuth).
* **Styling & UI:** **Tailwind CSS** (for responsive utilities) and **Framer Motion** (for smooth glassmorphism card transitions and modal pops).
* **Storage Bucket:** **Supabase Storage** (S3-compatible free tier) named `event-verifications` for hosting uploaded group photos.
* **Payments:** **Razorpay Sandbox** (free testing mode) and manual **UPI QR/UTR** redirection fallback.

---

## 3. SEO Dominance Blueprint

SEO is a top priority to outrank competitors. The Next.js routing and content engine are configured as follows:

### A. Dynamic Semantic URL Routing
Every city, category, and neighborhood combination has a unique static URL structure:
* `/[city]/[activity_category]/[locality]`
* *Example:* `/bangalore/badminton/hsr-layout`
* *Example:* `/bangalore/board-games/indiranagar`

Next.js will Server-Side Render (SSR) these pages. When Google crawls the URL, the server queries Supabase for upcoming matches in that category/neighborhood and returns pre-populated HTML containing keywords like: *"badminton partners HSR Layout"*, *"meet board game players Indiranagar"*.

### B. Individual Event Sharing URLs
* **Structure:** `/event/[event_id]`
* When accessed, it loads the main layout and automatically displays the dashboard with the corresponding Details Drawer pre-opened. This allows users to share direct match links on WhatsApp.

### C. Structured Event Schema (JSON-LD)
On every individual event page, we inject Google Event Schema. This prompts Google to display your matches as an interactive event card at the very top of Google Search:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Saturday Morning Badminton Doubles",
  "startDate": "2026-08-22T07:00:00+05:30",
  "endDate": "2026-08-22T09:00:00+05:30",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Play Arena Sarjapur",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bangalore",
      "addressRegion": "KA",
      "addressCountry": "IN"
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "150",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

---

## 4. Production Database Schema (`schema.sql`)

Copy-paste this script directly into the Supabase SQL Editor to provision the complete database with strict foreign keys, performance indexes, and serverless triggers.

```sql
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

-- 6. Create Notifications Table (In-app notifications)
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
-- SECURITY TRIGGERS: AUTOMATED REWARDS & COMPLETIONS (ANTI-CHEAT)
-- ========================================================

-- Trigger Function: Process event completions securely on Server
CREATE OR REPLACE FUNCTION public.handle_event_completion()
RETURNS TRIGGER AS $$
DECLARE
    attendee_record RECORD;
    today_payouts_count INTEGER;
BEGIN
    -- Only run if status transitioned from 'Open' to 'Completed'
    IF NEW.status = 'Completed' AND OLD.status = 'Open' THEN
        
        -- 1. Credit Organizer: Increment successful hosts & grant 30 TrustPoints (check daily cap)
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
        END IF;

        -- 2. Credit Attendees: Grant 10 TrustPoints to all verified joined squad members (except the host)
        FOR attendee_record IN 
            SELECT user_id FROM public.bookings WHERE event_id = NEW.id AND user_id != NEW.host_id
        LOOP
            -- Check daily cap for attendee
            SELECT COUNT(*) INTO today_payouts_count 
            FROM public.trust_points_ledger 
            WHERE user_id = attendee_record.user_id AND transaction_type = 'Join_Reward' AND created_at >= NOW() - INTERVAL '1 day';

            IF today_payouts_count = 0 THEN
                UPDATE public.profiles 
                SET trust_points = trust_points + 10
                WHERE id = attendee_record.user_id;

                INSERT INTO public.trust_points_ledger (user_id, amount, transaction_type, event_id)
                VALUES (attendee_record.user_id, 10, 'Join_Reward', NEW.id);
            END IF;
            
            -- If booking payment status was Escrow_Held, transition it to Released
            UPDATE public.bookings 
            SET payment_status = 'Released'
            WHERE event_id = NEW.id AND user_id = attendee_record.user_id;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind completion trigger to events table
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
```

---

## 5. Image Storage & Client-Side Compression

### A. Supabase Storage Settings
Create a public storage bucket named `event-verifications`.
* **Upload Path Structure:** `event-verifications/[user_id]/[event_id].jpg`
* **Security Policy:**
  * Read: `Public` (anyone can view group photos).
  * Write/Upload: Only authenticated users where the folder path `[user_id]` matches their `auth.uid()`. This avoids doing database lookup queries inside the storage policy.

### B. Client-Side Image Resizing Utility
To prevent heavy 5MB–10MB phone uploads from filling up your free tier storage, run this lightweight JavaScript compressor in the browser before invoking Supabase upload:

```javascript
// Compress photo to lightweight JPEG (~150KB)
export async function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
    };
  });
}
```

---

## 6. Payment & Escrow Implementation

### Option A: The UPI Intent Route (Free, Quick Launch)
The app outputs a dynamic payment URL scheme. When clicked on a smartphone, it opens GPay/PhonePe directly:
```
upi://pay?pa=[UPI_ID]&pn=ActiveWeekend&am=[AMOUNT]&tn=Join_[EVENT_ID]&cu=INR
```
* **Desktop Fallback:** The app converts this link into a QR code using a free generator:
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=[ENCODED_UPI_URI]`
* **Verification:** The user uploads the 12-digit UPI reference ID (UTR). The app validates it is unique in the `bookings` table.

### Option B: Razorpay Gateway Integration
1. **Frontend Trigger:**
   Load the script `https://checkout.razorpay.com/v1/checkout.js` and call:
   ```javascript
   const options = {
     key: "YOUR_RAZORPAY_KEY",
     amount: amountInPaise,
     currency: "INR",
     name: "ActiveWeekend Bangalore",
     order_id: razorpayOrderId, // Created securely on backend
     handler: function (response) {
       verifyPaymentOnServer(response);
     }
   };
   const rzp = new Razorpay(options);
   rzp.open();
   ```
2. **Backend Validation:**
   The serverless API verifies the payment signature using cryptographic checks:
   ```javascript
   const crypto = require("crypto");
   const generatedSignature = crypto
     .createHmac("sha256", process.env.RAZORPAY_SECRET)
     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
     .digest("hex");

   if (generatedSignature === razorpaySignature) {
     // Securely update booking status to 'Escrow_Held' in Supabase
   }
   ```

---

## 7. Mitigating Loop-Holes & Operational Edge Cases

### A. Host Abandonment (Locked Escrow)
* **Risk:** A host gathers payment or trust points for a meetup and forgets to click "Mark Completed", locking guest escrows.
* **Safeguard:** Payments and TrustPoints are automatically completed/released **48 hours after the scheduled event date**, unless an attendee logs a "Host No-Show" dispute in the system.

### B. Cheating the 3-Free-Event Limit
* **Risk:** A host registers fake accounts to RSVP to 3 mock events in 10 minutes to unlock paid hosting.
* **Safeguard:** 
  1. Google Auth is required, making fake profile generation difficult.
  2. The completion trigger requires a minimum of **3 unique attendee check-ins (excluding the host)**.
  3. The host must upload a group selfie photo at the venue.
  4. Attendees receive a notification to verify they were in the group.

### C. The Last-Minute Roster Flake (Trust Penalty Clamping)
* **Risk:** A player cancels 1 hour before a badminton match, leaving 3 players unable to play doubles.
* **Safeguard:** 
  * Free cancellations are only permitted up to **6 hours** before the event.
  * Cancel under 6 hours on paid event $\rightarrow$ forfeit 50% of booking ticket (given to host).
  * Cancel under 6 hours on free event $\rightarrow$ deducts 30 TrustPoints.
  * **Clamping:** Points are clamped at zero (`GREATEST(0, trust_points - 30)`) to prevent database transaction errors. However, users who fall below **50 TrustPoints** ("High-Flake Risk") are blocked from RSVPing to any new matches.

### D. Under-the-Table Payments
* **Risk:** Host sets up a "Free" event, but tells players in the chat to UPI them directly to avoid platform commission.
* **Safeguard:** Regex content filters automatically run on description forms and chat logs, masking bank details, UPI suffixes (`@ybl`, `@okaxis`), or phrases like *"Gpay me directly"*.

### E. Roster Overbooking (Race Conditions)
* **Risk:** Two users click join on the last open spot simultaneously, overbooking the roster.
* **Safeguard:** A Postgres trigger runs inside a database transaction during insertion to the `bookings` table, rejecting any RSVP if the current booking count equals `max_slots`.

### F. Price Hijacking
* **Risk:** A host creates a "Free" match, waits for players to join, and then edits the event to change it to "Paid" to bypass host limits.
* **Safeguard:** Changing `cost_type` to "Paid" checks if the host has `successful_hostings >= 3`. The application freezes cost and price edits completely once the first guest booking has occurred.

---

## 8. Step-by-Step Production Roadmap

1. **Step 1: Set up Next.js Workspace**
   Initialize a Next.js (React) project and configure it with Tailwind CSS. Set up dynamic category and individual event routing structures.
2. **Step 2: Initialize Supabase**
   Create a free Supabase project. Copy-paste the updated `schema.sql` file (from Section 4) into the SQL Editor and execute. Turn on Row-Level Security.
3. **Step 3: Build the UI Pages & Layouts**
   Develop the explore dashboard, filters, details drawer, host forms, chat boards, and `/admin` console. Use Framer Motion for premium animations.
4. **Step 4: Integrate Supabase Client & Auth**
   Connect the frontend to Supabase Google OAuth and database tables, swapping out the local storage mock data.
5. **Step 5: Setup Image Compressor & Storage Bucket**
   Add the client-side canvas compressor script. Set up the `event-verifications` bucket in Supabase Storage with security policies.
6. **Step 6: Write API Routes for Payment Gateways**
   Create Next.js Serverless Functions for creating Razorpay Orders and validating payment signatures securely. Add UPI QR generator fallbacks.
7. **Step 7: Deploy**
   Deploy your code to Vercel (free) and set your Supabase / Razorpay environmental API key variables inside the Vercel dashboard.
