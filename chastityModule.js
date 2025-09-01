// chastityModule.js

// Core function: get chastity status
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return;
  const { data } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    if (statusElement) statusElement.innerText = "You are not locked.";
    return;
  }

  const latest = data[0];
  const now = new Date();
  const release = new Date(latest.release_date);

  if (latest.is_locked && release > now) {
    if (statusElement) statusElement.innerText = `Locked until ${release.toLocaleString()}.`;
  } else {
    if (statusElement) statusElement.innerText = "You are not locked.";
  }
}

// Reduce time for task completion
async function reduceTimeForTask(supabase, minutes) {
  if (!window.currentUser) return;

  const { data } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return;
  const latest = data[0];
  if (!latest.is_locked) return;

  const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60 * 1000);
  await supabase
    .from("chastityStatus")
    .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", latest.id);
}

// Attempt to beg for release
async function attemptBegRelease(supabase, outputElement) {
  if (!window.currentUser) return;

  const { data } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    if (outputElement) outputElement.innerText = "No chastity status found.";
    return;
  }

  const latest = data[0];

  if (latest.is_locked) {
    // -----------------------------
    // LOCKED: 10% release / 90% denial
    // -----------------------------
    const roll = Math.random();
    if (roll < 0.1) {
      // SUCCESS: unlock
      await supabase
        .from("chastityStatus")
        .update({
          is_locked: false,
          release_date: new Date().toISOString(),
          source: "beg_success",
          updated_at: new Date().toISOString()
        })
        .eq("id", latest.id);

      if (outputElement) outputElement.innerText = "Mercy granted... Goddess KAREENA releases you.";
    } else {
      // FAILURE: add penalty delay (10–70 minutes randomly)
      const extraMinutes = Math.floor(Math.random() * 61) + 10; 
      const newRelease = new Date(latest.release_date);
      newRelease.setMinutes(newRelease.getMinutes() + extraMinutes);

      await supabase
        .from("chastityStatus")
        .update({
          release_date: newRelease.toISOString(),
          source: "beg_failure",
          updated_at: new Date().toISOString()
        })
        .eq("id", latest.id);

      if (outputElement) outputElement.innerText = `Your begging displeased Goddess KAREENA. +${extraMinutes} minutes added.`;
    }

  } else {
    // -----------------------------
    // UNLOCKED: pick a random releaseOption
    // -----------------------------
    const { data: options, error } = await supabase
      .from("releaseOptions")
      .select("option")
      .order("RANDOM()")
      .limit(1);

    if (error || !options || options.length === 0) {
      if (outputElement) outputElement.innerText = "No release options available.";
      return;
    }

    if (outputElement) outputElement.innerText = options[0].option;
  }

  // Update UI
  const statusP = document.getElementById("chastityStatus");
  await getChastityStatus(supabase, statusP);
}

// Load module
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  // Assign globals for Index compatibility
  window.reduceTimeForTask = async (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = async (outputEl) => attemptBegRelease(supabase, outputEl);

  // Initial load + periodic refresh
  await getChastityStatus(supabase, statusP);
  setInterval(() => getChastityStatus(supabase, statusP), 60000);
}

// Export functions
export { reduceTimeForTask, attemptBegRelease };
