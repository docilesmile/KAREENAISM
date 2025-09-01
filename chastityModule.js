// chastityModule.js

// Fetch latest chastity status for current user
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return null;

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

// Reduce chastity time by given minutes
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

// Add time for any unfinished tasks (integration with tasksModule)
async function addTimeForIncompleteTasks(supabase) {
  if (!window.currentUser) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: rolled, error: rolledErr } = await supabase
    .from("rolled_tasks")
    .select("id, done, difficulty")
    .eq("user_id", window.currentUser.id)
    .eq("day_key", today);

  if (rolledErr) return console.error("Error fetching rolled tasks:", rolledErr);
  if (!rolled || rolled.length === 0) return;

  const incompleteTasks = rolled.filter(t => !t.done);
  if (incompleteTasks.length === 0) return;

  let totalMinutes = 0;
  incompleteTasks.forEach(task => {
    if (task.difficulty === "Easy") totalMinutes += 60;
    else if (task.difficulty === "Medium") totalMinutes += 120;
    else if (task.difficulty === "Hard") totalMinutes += 300;
  });

  if (totalMinutes > 0) {
    console.log(`Adding ${totalMinutes} minutes for unfinished tasks`);
    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;
    const latest = data[0];

    if (!latest.is_locked || !latest.release_date) return;

    const newRelease = new Date(new Date(latest.release_date).getTime() + totalMinutes * 60000);

    await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", latest.id);

    console.log(`Updated release date due to unfinished tasks: ${newRelease}`);
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

  // If locked: 10% release, 90% denial with +24h
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

// Load chastity module (integration with tasksModule)
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  // Assign globals for tasksModule
  window.reduceTimeForTask = async (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = async (outputEl) => attemptBegRelease(supabase, outputEl);

  // Initial load
  await getChastityStatus(supabase, statusP);

  // Add time for any unfinished tasks
  await addTimeForIncompleteTasks(supabase);

  // Refresh status every minute
  setInterval(() => getChastityStatus(supabase, statusP), 60000);
}

export { reduceTimeForTask, attemptBegRelease };
