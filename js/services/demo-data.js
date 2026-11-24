export const demoArtist = {
  id: "demo-artist",
  name: "Maya Nse",
  slug: "maya-nse",
  bio: "Afro-soul songwriter turning quiet moments into warm, cinematic stories.",
  avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=85",
  cover_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=88",
  social_links: { instagram: "#", youtube: "#", spotify: "#" },
};

export const demoProjects = [
  { id: "p1", artist_id: "demo-artist", title: "Midnight in Douala", description: "A late-night EP about distance and home.", category: "ep", cover_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=88", is_paid: true, price_xaf: 2500, is_published: true },
  { id: "p2", artist_id: "demo-artist", title: "No Rush", description: "A sunlit single for slower days.", category: "single", cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=88", is_paid: false, price_xaf: 0, is_published: true },
  { id: "p3", artist_id: "demo-artist", title: "Behind the Sessions", description: "Visual moments and live recordings.", category: "visual", cover_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=88", is_paid: false, price_xaf: 0, is_published: true },
];

export const demoTracks = [
  { id: "t1", project_id: "p1", title: "Akwa Lights", description: "The city at 2 AM.", track_type: "audio", is_paid: true, price_xaf: 800, duration: "3:42", position: 1, video_url: null },
  { id: "t2", project_id: "p1", title: "Motorway", description: "A road song.", track_type: "audio", is_paid: true, price_xaf: 800, duration: "4:08", position: 2, video_url: null },
  { id: "t3", project_id: "p2", title: "No Rush", description: "Free first listen.", track_type: "audio", is_paid: false, price_xaf: 0, duration: "3:25", position: 1, video_url: null },
  { id: "t4", project_id: "p3", title: "Live in Buea", description: "Exclusive session visual.", track_type: "video", is_paid: true, price_xaf: 1200, duration: "6:15", position: 1, video_url: null },
];
