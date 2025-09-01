// chastityModule.js

// Get the latest chastity status for the current user
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

// Apply penalties for incomplete tasks (only if locked)
async function applyPenaltiesForIncompleteTasks(supabase) {
  if (!window.currentUser) return;

  const now = new Date();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all incomplete tasks for today
  const { data: incompleteTasks, error } = await supabase
    .from("rolled_tasks")
    .select("task_id, difficulty, done")
    .eq("user_id", window.currentUser.id)
    .eq("day_key", today)
    .eq("done", false);

  if (error || !incompleteTasks || incompleteTasks.length === 0) return;

  // Fetch latest chastity status
  const { data: statusData } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!statusData || statusData.length === 0) return;
  const latest = statusData[0];

  if (!latest.is_locked || !latest.release_date) return;

  // Fetch penalties from PenaltyRules table
  const { data: penalties } = await supabase.from("PenaltyRules").select("*");
  if (!penalties) return;

  let totalPenalty = 0;
  incompleteTasks.forEach(task => {
    const rule = penalties.find(p => p.difficulty === task.difficulty);
    if (rule) totalPenalty += rule.penalty;
  });

  if (totalPenalty === 0) return;

  const newRelease = new Date(new Date(latest.release_date).getTime() + totalPenalty * 3600000);
  await supabase
    .from("chastityStatus")
    .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", latest.id);

  console.log(`Applied penalty for incomplete tasks: +${totalPenalty} hours. New release: ${newRelease}`);
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

  // If unlocked
  if (!latest.is_locked || !latest.release_date || new Date(latest.release_date) <= now) {
    const { data: options } = await supabase.from("releaseOptions").select("*");
    if (!options || options.length === 0) {
      outputElement.innerText = "Goddess KAREENA has no release options set.";
      return;
    }
    const selected = options[Math.floor(Math.random() * options.length)];
    outputElement.innerText = `Goddess KAREENA says: ${selected.task || "..."}`;
    console.log("Unlocked beg release selection:", selected);
    return;
  }

  // If locked: 10% chance of mercy, else +24h
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

    if (outputElement) outputElement.innerText = "Mercy granted... Goddess KAREENA releases you.";
    console.log("Beg release success!");
  } else {
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

  // Assign globals for Index and tasksModule
  window.reduceTimeForTask = async (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = async (outputEl) => attemptBegRelease(supabase, outputEl);
  window.applyPenaltiesForIncompleteTasks = async () => applyPenaltiesForIncompleteTasks(supabase);

  // Initial load
  await getChastityStatus(supabase, statusP);

  // Refresh every minute
  setInterval(() => getChastityStatus(supabase, statusP), 60000);
}

// Canon exports
export { reduceTimeForTask, attemptBegRelease, applyPenaltiesForIncompleteTasks, loadChastityModule };
