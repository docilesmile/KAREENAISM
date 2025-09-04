// ------------------------
// Helper functions
async function reduceTimeForTask(supabase, taskId) {
  try {
    const { data, error } = await supabase
      .from('rolled_tasks')
      .update({ reduced: true })
      .eq('id', taskId);

    if (error) throw error;
    console.log("Time reduced for task:", data);
  } catch (err) {
    console.error("Error reducing time for task:", err.message);
  }
}

async function attemptBegRelease(supabase, userId) {
  try {
    const chance = Math.random();
    if (chance < 0.2) { 
      // 20% chance of success
      const { data, error } = await supabase
        .from('chastity')
        .update({ is_locked: false })
        .eq('user_id', userId);

      if (error) throw error;
      console.log("Release granted:", data);
      return true;
    } else {
      console.log("Release denied by Goddess KAREENA.");
      return false;
    }
  } catch (err) {
    console.error("Error attempting release:", err.message);
    return false;
  }
}

async function applyPenaltiesForIncompleteTasks(supabase, userId) {
  try {
    const { data: tasks, error } = await supabase
      .from('rolled_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('done', false);

    if (error) throw error;

    if (tasks.length > 0) {
      const extraTime = tasks.length * 60 * 60 * 1000; // 1h penalty per task
      const { data, error: updateError } = await supabase
        .from('chastity')
        .update({ release_date: new Date(Date.now() + extraTime).toISOString() })
        .eq('user_id', userId);

      if (updateError) throw updateError;
      console.log("Applied penalties:", data);
    }
  } catch (err) {
    console.error("Error applying penalties:", err.message);
  }
}

async function applyRandomLockup(supabase, userId) {
  try {
    const chance = Math.random();
    if (chance < 0.1) { 
      // 10% chance
      const extraTime = 24 * 60 * 60 * 1000; // 24h lockup
      const { data, error } = await supabase
        .from('chastity')
        .update({ release_date: new Date(Date.now() + extraTime).toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      console.log("Random lockup applied:", data);
    }
  } catch (err) {
    console.error("Error applying random lockup:", err.message);
  }
}

// ------------------------
// Load module into Index
async function loadChastityModule(supabase) {
  const container = document.getElementById("modulesContainer");
  const section = document.createElement("div");
  section.innerHTML = `
    <h2>⛓️ Chastity Module</h2>
    <button id="begReleaseBtn">Beg Goddess KAREENA for Release</button>
    <button id="penaltyBtn">Apply Penalties</button>
    <button id="lockupBtn">Risk Random Lockup</button>
    <div id="chastityStatus"></div>
  `;
  container.appendChild(section);

  const user = window.currentUser;
  if (!user) {
    document.getElementById("chastityStatus").innerText =
      "Not logged in — chastity status unknown.";
    return;
  }

  const statusDiv = document.getElementById("chastityStatus");

  // Load current chastity status
  try {
    const { data, error } = await supabase
      .from('chastity')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    if (data) {
      statusDiv.innerText = data.is_locked
        ? `You are LOCKED. Release date: ${new Date(data.release_date).toLocaleString()}`
        : "You are FREE (for now).";
    } else {
      statusDiv.innerText = "No chastity record found.";
    }
  } catch (err) {
    console.error("Error loading chastity status:", err.message);
    statusDiv.innerText = "Error loading chastity status.";
  }

  // Button handlers
  document.getElementById("begReleaseBtn").addEventListener("click", async () => {
    const success = await attemptBegRelease(supabase, user.id);
    statusDiv.innerText = success
      ? "By divine mercy, Goddess KAREENA granted you release."
      : "Denied. Remain locked, servant.";
  });

  document.getElementById("penaltyBtn").addEventListener("click", async () => {
    await applyPenaltiesForIncompleteTasks(supabase, user.id);
    statusDiv.innerText = "Penalties applied for unfinished tasks.";
  });

  document.getElementById("lockupBtn").addEventListener("click", async () => {
    await applyRandomLockup(supabase, user.id);
    statusDiv.innerText = "Random lockup considered by Goddess KAREENA.";
  });
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
