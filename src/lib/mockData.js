export const MOCK_EVENTS = [
  {
    id: "e1",
    host_id: "h1",
    host: {
      username: "Karthik (Court Ace)",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=karthik"
    },
    title: "Saturday Morning Badminton Doubles",
    activity_type: "Badminton",
    locality: "HSR Layout",
    venue_name: "Namma Play Arena, Sector 2",
    event_date: "2026-08-22",
    event_time: "7:00 AM - 9:00 AM",
    skill_level: "Intermediate",
    max_slots: 4,
    cost_type: "Split",
    cost_value: 150,
    description: "Looking for 2 intermediate players to split a court for doubles. Bring your own rackets and non-marking shoes.",
    status: "Open",
    bookings: [
      { user_id: "h1", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=karthik" } },
      { user_id: "u2", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sid" } }
    ]
  },
  {
    id: "e2",
    host_id: "h2",
    host: {
      username: "Ananya S.",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=ananya"
    },
    title: "Catan & Board Games Evening",
    activity_type: "Board Games",
    locality: "Indiranagar",
    venue_name: "The Board Game Cafe",
    event_date: "2026-08-22",
    event_time: "5:00 PM - 8:00 PM",
    skill_level: "All Levels Welcome",
    max_slots: 6,
    cost_type: "Free",
    cost_value: 0,
    description: "Casual board game night. Hosting Catan, Ticket to Ride, and Secret Hitler. Cafe entry fee is ₹100 direct payment at venue.",
    status: "Open",
    bookings: [
      { user_id: "h2", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=ananya" } },
      { user_id: "u3", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rahul" } },
      { user_id: "u4", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sneha" } }
    ]
  },
  {
    id: "e3",
    host_id: "h3",
    host: {
      username: "Rohan D.",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rohan"
    },
    title: "Pickleball Singles Practice",
    activity_type: "Pickleball",
    locality: "Koramangala",
    venue_name: "Paddle Court Elite, 4th Block",
    event_date: "2026-08-23",
    event_time: "4:00 PM - 6:00 PM",
    skill_level: "Advanced",
    max_slots: 2,
    cost_type: "Paid",
    cost_value: 300,
    description: "Advanced court drilling session. Sharing rent. Premium Host event with verified court booking.",
    status: "Open",
    bookings: [
      { user_id: "h3", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rohan" } }
    ]
  },
  {
    id: "e4",
    host_id: "h4",
    host: {
      username: "Tejas (Trekker)",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=tejas"
    },
    title: "Savandurga Weekend Trek",
    activity_type: "Trekking",
    locality: "Sarjapur Road",
    venue_name: "Savandurga Base Camp",
    event_date: "2026-08-23",
    event_time: "5:30 AM - 1:00 PM",
    skill_level: "Intermediate",
    max_slots: 12,
    cost_type: "Free",
    cost_value: 0,
    description: "Join us for a morning trek up Savandurga. Carpooling from Sarjapur signal at 5:30 AM. Bring 2L water and sturdy shoes.",
    status: "Open",
    bookings: [
      { user_id: "h4", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=tejas" } },
      { user_id: "u5", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=priya" } },
      { user_id: "u6", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=arjun" } },
      { user_id: "u7", user: { avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=pooja" } }
    ]
  }
];

export const MOCK_CHATS = [
  { id: 1, user_id: "h1", username: "Karthik (Court Ace)", message: "Hey everyone! Rackets are available at the counter for rent if you don't have one.", created_at: "2026-08-15T09:30:00Z" },
  { id: 2, user_id: "u2", username: "Siddharth (Namma HSR)", message: "Awesome, I will bring my own Yonex. Do they have non-marking shoes for rent?", created_at: "2026-08-15T09:35:00Z" },
  { id: 3, user_id: "h1", username: "Karthik (Court Ace)", message: "Yes, they do, but sizes are limited. Better to carry clean non-marking sneakers if you have them.", created_at: "2026-08-15T09:38:00Z" }
];
