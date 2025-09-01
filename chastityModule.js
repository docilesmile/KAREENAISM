// chastityModule.js

// Fetch the latest chastity status for the current user
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return;

  console.log("Fetching chastity status for:", window.currentUser.id);

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
  const release = latest.release_date ? new Date(latest.release_date) : null;

  if (latest.is_locked && release && release > now) {
    if (statusElement) statusElement.innerText = `Locked until ${release.toLocaleString()}.`;
  } else {
    if (statusElement) statusElement.innerText = "You are not locked.";
  }

  return latest;
}

// Reduce chastity time (e.g., for completing tasks)
async function reduceTimeForTask(supabase, minutes) {
  if (!window.currentUser) return;

  const { data, error } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;
  const latest = data[0];

  if (!latest.is_locked || !latest.release_date) return;

  const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60000);

  await supabase
    .from("chastityStatus")
    .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", latest.id);

  console.log(`Reduced chastity time by ${minutes} minutes. New release: ${newRelease}`);
}

// Apply penalties for incomplete tasks when locked
async function applyPenaltiesForIncompleteTasks(supabase) {
  if (!window.currentUser) return;

  const latestStatus = await getChastityStatus(supabase);
  if (!latestStatus || !latestStatus.is_locked || !latestStatus.release_date) return;

  const today = new Date().toISOString().split("T")[0];

  // Fetch incomplete tasks for today
  const { data: tasks, error: tasksErr } = await supabase
    .from("rolled_tasks")
    .select("id, difficulty, done")
    .eq("user_id", window.currentUser.id)
    .eq("day_key", today)
    .eq("done", false);

  if (tasksErr) {
    console.error("Error fetching incomplete tasks for penalties:", tasksErr);
    return;
  }

  if (!tasks || tasks.length === 0) return;

  // Fetch penalties from PenaltyRules
  const { data: rules, error: rulesErr } = await supabase.from("PenaltyRules").select("*");
  if (rulesErr) {
    console.error("Error fetching penalty rules:", rulesErr);
    return;
  }

  let totalPenaltyMinutes = 0;

  tasks.forEach(task => {
    const rule = rules.find(r => r.difficulty === task.difficulty);
    if (rule && rule.penalty) {
      totalPenaltyMinutes += rule.penalty * 60; // convert hours to minutes
    }
  });

  if (totalPenaltyMinutes > 0) {
    const newRelease = new Date(new Date(latestStatus.release_date).getTime() + totalPenaltyMinutes * 60000);
    await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", latestStatus.id);

    console.log(`Applied ${totalPenaltyMinutes} minutes penalty for incomplete tasks. New release: ${newRelease}`);
  }
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

  if (!latest.is_locked || !latest.release_date || new Date(latest.release_date) <= now) {
    // Randomly select a release or denial task from releaseOptions
    const { data: options } = await supabase
      .from("releaseOptions")
      .select("*");

    if (!options || options.length === 0) {
      outputElement.innerText = "Goddess KAREENA has no release options set.";
      return;
    }

    const selected = options[Math.floor(Math.random() * options.length)];
    outputElement.innerText = `Goddess KAREENA says: ${selected.task || "..."}`;
    console.log("Unlocked beg release selection:", selected);
    return;
  }

  // If locked: 10% release, 90% denial with +delay
  const roll = Math.random();
  if (roll < 0.1) {
    // Release
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
    console.log("Beg release success!");
  } else {
    // Denial: add 24h
    const newRelease = new Date(latest.release_date);
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
    console.log("Beg release denied. New release:", newRelease);
  }
}

// Load module into Index
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  // Assign globals for Index / tasksModule
  window.reduceTimeForTask = async (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = async (outputEl) => attemptBegRelease(supabase, outputEl);
  window.applyPenaltiesForIncompleteTasks = async () => applyPenaltiesForIncompleteTasks(supabase);

  // Initial load
  await getChastityStatus(supabase, statusP);

  // Refresh every minute
  setInterval(() => getChastityStatus(supabase, statusP), 60000);
}

export { reduceTimeForTask, attemptBegRelease, applyPenaltiesForIncompleteTasks };
