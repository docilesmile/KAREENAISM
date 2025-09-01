// chastityModule.js

// Initialize Supabase client
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utility: get current user
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  return data.user;
}

// Fetch chastity status for the current user
async function getChastityStatus(userId) {
  const { data, error } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching chastity status:", error);
    return null;
  }
  return data;
}

// Update chastity status
async function updateChastityStatus(userId, updates) {
  const { data, error } = await supabase
    .from("chastityStatus")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating chastity status:", error);
    return null;
  }
  return data;
}

// Handle "Beg for Release"
async function begForRelease() {
  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in to beg for release.");
    return;
  }

  const status = await getChastityStatus(user.id);
  if (!status) {
    alert("No chastity status found for you.");
    return;
  }

  // Roll chance (10% success, 90% failure)
  const roll = Math.random();
  if (roll < 0.1) {
    // SUCCESS: unlock immediately
    await updateChastityStatus(user.id, {
      is_locked: false,
      release_date: new Date().toISOString(),
      source: "beg_success"
    });
    alert("Mercy granted... Goddess KAREENA releases you.");
  } else {
    // FAILURE: add 24 hours
    const newRelease = new Date(status.release_date);
    newRelease.setHours(newRelease.getHours() + 24);

    await updateChastityStatus(user.id, {
      release_date: newRelease.toISOString(),
      source: "beg_failure"
    });
    alert("Your begging displeased Goddess KAREENA. +24 hours added.");
  }
}

// Wire button
document.addEventListener("DOMContentLoaded", () => {
  const begButton = document.getElementById("begReleaseButton");
  if (begButton) {
    begButton.addEventListener("click", begForRelease);
  }
});
