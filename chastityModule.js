// chastityModule.js

// ------------------------
// Helper: Parse Supabase timestamp safely
function parseTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts.toString().replace("+00", "Z"));
}

// ------------------------
// Get the latest chastity status for the current user
async function getChastityStatus(supabase, statusElement) {
  if (!window.currentUser) return null;

  try {
    const { data, error } = await supabase
      .from("public.chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading chastity status:", error);
      if (statusElement) statusElement.innerText = "Error fetching chastity status.";
      return null;
    }

    const latest = data?.[0];
    if (!latest) {
      if (statusElement) statusElement.innerText = "No chastity status found.";
      return null;
    }

    const now = new Date();
    const release = parseTimestamp(latest.release_date);

    if (latest.is_locked && release && release > now) {
      if (statusElement) statusElement.innerText = `Locked until ${release.toLocaleString()}.`;
    } else {
      if (statusElement) statusElement.innerText = "You are not locked.";
    }

    return latest;

  } catch (err) {
    console.error("Error in getChastityStatus:", err);
    if (statusElement) statusElement.innerText = "Error fetching chastity status.";
    return null;
  }
}

// ------------------------
// Reduce chastity time for completing tasks
async function reduceTimeForTask(supabase, minutes) {
  if (!window.currentUser) return;

  const { data, error } = await supabase
    .from("public.chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;
  const latest = data[0];
  if (!latest.is_locked || !latest.release_date) return;

  const releaseDate = parseTimestamp(latest.release_date);
  const newRelease = new Date(releaseDate.getTime() - minutes * 60000);

  await supabase
    .from("public.chastityStatus")
    .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", latest.id);

  console.log(`Reduced chastity time by ${minutes} minutes. New release: ${newRelease}`);
}

// ------------------------
// Apply penalties for incomplete tasks
async function applyPenaltiesForIncompleteTasks(supabase) {
  if (!window.currentUser) return;

  const today = new Date().toISOString().split("T")[0];

  const { data: incompleteTasks, error } = await supabase
    .from("rolled_tasks")
    .select("id, task, difficulty, done")
    .eq("user_id", window.currentUser.id)
    .eq("day_key", today)
    .eq("done", false);

  if (error) {
    console.error("Error fetching incomplete tasks:", error);
    return;
  }

  if (!incompleteTasks || incompleteTasks.length === 0) return;

  const { data: rules } = await supabase.from("punishments").select("*");
  if (!rules) return;

  const { data: statusData } = await supabase
    .from("public.chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!statusData || statusData.length === 0) return;
  const latest = statusData[0];
  if (!latest.is_locked || !latest.release_date) return;

  const releaseDate = parseTimestamp(latest.release_date);

  let totalPenaltyMinutes = 0;
  for (const task of incompleteTasks) {
    const rule = rules.find(r => r.difficulty === task.difficulty);
    if (rule) totalPenaltyMinutes += (rule.penalty || 0) * 60;
  }

  const newRelease = new Date(releaseDate.getTime() + totalPenaltyMinutes * 60000);

  await supabase
    .from("public.chastityStatus")
    .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", latest.id);

  console.log(`Applied penalties for ${incompleteTasks.length} incomplete tasks. New release: ${newRelease}`);
}

// ------------------------
// Beg for release button
async function attemptBegRelease(supabase, outputElement) {
  if (!window.currentUser) return;

  const latest = await getChastityStatus(supabase, outputElement);
  if (!latest) {
    if (outputElement) outputElement.innerText = "No chastity status found.";
    return;
  }

  const now = new Date();
  const releaseDate = parseTimestamp(latest.release_date);

  if (!latest.is_locked || !releaseDate || releaseDate <= now) {
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

  const roll = Math.random();
  if (roll < 0.1) {
    await supabase
      .from("public.chastityStatus")
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
    const newRelease = new Date(releaseDate.getTime() + 24 * 60 * 60000);
    await supabase
      .from("public.chastityStatus")
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

// ------------------------
// Random lockup (Option B: sparing extension)
async function applyRandomLockup(supabase) {
  if (!window.currentUser) return;

  try {
    const chance = 0.2;
    if (Math.random() > chance) return;

    const { data, error } = await supabase
      .from("public.chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;

    const latest = data[0];
    let releaseDate = parseTimestamp(latest.release_date) || new Date();

    const { data: punishments } = await supabase.from("punishments").select("*");
    if (!punishments || punishments.length === 0) return;

    const selected = punishments[Math.floor(Math.random() * punishments.length)];
    const penaltyDays = selected.penalty || 1;

    if (!latest.is_locked) {
      releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + penaltyDays);

      await supabase.from("public.chastityStatus").insert({
        user_id: window.currentUser.id,
        release_date: releaseDate.toISOString(),
        is_locked: true,
        source: "random_lockup",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log(`🔒 Goddess locked you randomly for ${penaltyDays} days (${selected.difficulty})!`);
    } else if (Math.random() < 0.1) {
      releaseDate.setDate(releaseDate.getDate() + penaltyDays);

      await supabase
        .from("public.chastityStatus")
        .update({
          release_date: releaseDate.toISOString(),
          source: "random_lockup_extend",
          updated_at: new Date().toISOString()
        })
        .eq("id", latest.id);

      console.log(`⚠️ Goddess extended your lockup by ${penaltyDays} days (${selected.difficulty})!`);
    } else {
      console.log("Goddess chose not to extend your lockup this time.");
    }
  } catch (err) {
    console.error("Random lockup error:", err);
  }
}

// ------------------------
// Load module into Index
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  window.reduceTimeForTask = async (minutes) => reduceTimeForTask(supabase, minutes);
  window.attemptBegRelease = async (outputEl) => attemptBegRelease(supabase, outputEl);
  window.applyPenaltiesForIncompleteTasks = async () => applyPenaltiesForIncompleteTasks(supabase);
  window.applyRandomLockup = async () => applyRandomLockup(supabase);

  await getChastityStatus(supabase, statusP);

  setInterval(() => getChastityStatus(supabase, statusP), 60000);

  // Daily random lockup check at 4am
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
      await applyRandomLockup(supabase);
    }
  }, 60000);
}

// ------------------------
// Final exports
export { 
  reduceTimeForTask, 
  attemptBegRelease, 
  applyPenaltiesForIncompleteTasks, 
  applyRandomLockup, 
  loadChastityModule 
};
