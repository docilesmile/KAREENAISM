// chastityModule.js

// Get current chastity status
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return;

  const { data } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    if (statusElement) statusElement.innerText = "No chastity status found.";
    return;
  }

  const latest = data[0];
  const now = new Date();
  const release = latest.release_date ? new Date(latest.release_date) : null;

  if (latest.is_locked && release && release > now) {
    if (statusElement) statusElement.innerText = `Locked until ${release.toLocaleString()}.`;
  } else {
    if (statusElement) statusElement.innerText = "You are not locked.";
  }
}

// Reduce time from current lock (after completing a task)
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
  if (!latest.is_locked || !latest.release_date) return;

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

  // UNLOCKED: pick random releaseOption
  if (!latest.is_locked) {
    const { data: options } = await supabase.from("releaseOptions").select("*");
    if (!options || options.length === 0) {
      if (outputElement) outputElement.innerText = "Goddess KAREENA has nothing for you at the moment...";
      return;
    }
    const choice = options[Math.floor(Math.random() * options.length)];
    if (outputElement) outputElement.innerText = choice?.message || "Goddess KAREENA has something for you...";
    return;
  }

  // LOCKED: 10% release / 90% denial
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
    // FAILURE: +24 hours
    const newRelease = latest.release_date ? new Date(latest.release_date) : new Date();
    newRelease.setHours(newRelease.getHours() + 24);

    await supabase
      .from("chastityStatus")
      .update({
        release_date: newRelease.toISOString(),
        source: "beg_failure",
        updated_at: new Date().toISOString()
      })
      .eq("id", latest.id);

    if (outputElement) outputElement.innerText = "Your begging displeased Goddess KAREENA. +24 hours added.";
  }
}

// Load Chastity Module UI
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

// Export so Index can import
export { reduceTimeForTask, attemptBegRelease };
