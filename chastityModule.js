// chastityModule.js

// Fetch chastity status
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return;

  const { data, error } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Chastity status fetch error:", error);
    if (statusElement) statusElement.innerText = "Error fetching chastity status.";
    return null;
  }

  if (!data || data.length === 0) {
    if (statusElement) statusElement.innerText = "No chastity status found.";
    return null;
  }

  const latest = data[0];
  const now = new Date();
  const release = latest.release_date ? new Date(latest.release_date + 'Z') : null;

  if (latest.is_locked && release && release > now) {
    if (statusElement) statusElement.innerText =
      `Locked until ${release.toLocaleString()}.`;
  } else {
    if (statusElement) statusElement.innerText = "You are not locked.";
  }

  return latest;
}

// Reduce chastity time
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

  const releaseDate = new Date(latest.release_date + 'Z');
  const newRelease = new Date(releaseDate.getTime() - minutes * 60000);

  await supabase
    .from("chastityStatus")
    .update({
      release_date: newRelease.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", latest.id);

  console.log(`Reduced chastity time by ${minutes} minutes. New release: ${newRelease}`);
}

// Penalties at 2am
async function applyPenaltiesForIncompleteTasks(supabase) {
  if (!window.currentUser) return;

  const today = new Date().toISOString().split("T")[0];

  const { data: incompleteTasks, error } = await supabase
    .from("rolled_tasks")
    .select("id, task, difficulty, done")
    .eq("user_id", window.currentUser.id)
    .eq("day_key", today)
    .eq("done", false);

  if (error) return console.error("Error fetching incomplete tasks:", error);
  if (!incompleteTasks || incompleteTasks.length === 0) return;

  const { data: rules } = await supabase.from("PenaltyRules").select("*");
  if (!rules) return;

  const { data: statusData } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!statusData || statusData.length === 0) return;
  const latest = statusData[0];
  if (!latest.is_locked || !latest.release_date) return;

  const releaseDate = new Date(latest.release_date + 'Z');
  let totalPenaltyMinutes = 0;

  for (const task of incompleteTasks) {
    const rule = rules.find(r => r.difficulty === task.difficulty);
    if (rule) totalPenaltyMinutes += (rule.penalty || 0) * 60;
  }

  const newRelease = new Date(releaseDate.getTime() + totalPenaltyMinutes * 60000);

  await supabase
    .from("chastityStatus")
    .update({
      release_date: newRelease.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", latest.id);

  console.log(`Applied penalties for ${incompleteTasks.length} incomplete tasks. New release: ${newRelease}`);
}

// Beg for release
async function attemptBegRelease(supabase, outputElement) {
  if (!window.currentUser) return;

  const latest = await getChastityStatus(supabase, outputElement);
  if (!latest) {
    if (outputElement) outputElement.innerText = "No chastity status found.";
    return;
  }

  const now = new Date();
  const releaseDate = latest.release_date ? new Date(latest.release_date + 'Z') : null;

  if (!latest.is_locked || !releaseDate || releaseDate <= now) {
    // Random release option
    const { data: options } = await supabase.from("releaseOptions").select("*");
    if (!options || options.length === 0) {
      outputElement.innerText = "Goddess KAREENA has no release options set.";
      return;
    }
    const selected = options[Math.floor(Math.random() * options.length)];
    outputElement.innerText = `Goddess KAREENA says: ${selected.task || "..."}`;
    return;
  }

  // Locked: 10% release, 90% denial
  const roll = Math.random();
  if (roll < 0.1) {
    await supabase
      .from("chastityStatus")
      .update({
        is_locked: false,
        release_date: new Date().toISOString(),
        source: "beg_success",
        updated_at: new Date().toISOString()
      })
      .eq("id", latest.id);

    outputElement.innerText = "Mercy granted... Goddess KAREENA releases you.";
  } else {
    const newRelease = new Date(releaseDate.getTime() + 24 * 60 * 60000); // +24h
    await supabase
      .from("chastityStatus")
      .update({
        release_date: newRelease.toISOString(),
        source: "beg_failure",
        updated_at: new Date().toISOString()
      })
      .eq("id", latest.id);

    outputElement.innerText =
      "Your begging displeased Goddess KAREENA. +24 hours added.";
  }
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

  // Assign globals
  window.reduceTimeForTask = (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = (outputEl) => attemptBegRelease(supabase, outputEl);
  window.applyPenaltiesForIncompleteTasks = () => applyPenaltiesForIncompleteTasks(supabase);

  // Initial load
  await getChastityStatus(supabase, statusP);

  // Refresh every minute
  setInterval(() => getChastityStatus(supabase, statusP), 60000);
}
