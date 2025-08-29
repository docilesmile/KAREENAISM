// chastityModule.js
export async function loadChastityModule(supabase) {
  if (!supabase) throw new Error("Supabase client must be passed into chastityModule");

  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `
    <h2>Chastity Status</h2>
    <p id="chastityStatus">Loading...</p>
  `;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  // ---------------- Helper: get latest chastity status ----------------
  async function getChastityStatus() {
    if (!window.currentUser) return;
    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return console.error(error);

    if (!data || data.length === 0) {
      statusP.innerText = "You are not locked. Goddess has not dictated your chastity yet.";
      return;
    }

    const latest = data[0];
    const now = new Date();
    const releaseDate = new Date(latest.release_date);

    if (latest.is_locked && releaseDate > now) {
      statusP.innerText = `You are locked until ${releaseDate.toLocaleString()}. Source: ${latest.source}`;
    } else {
      statusP.innerText = "You are not locked. Goddess may decide soon.";
    }
  }

  // ---------------- Reduce chastity time by minutes ----------------
  window.reduceTimeForTask = async function(minutes) {
    if (!window.currentUser) return;

    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return console.error(error);
    if (!data || data.length === 0) return;

    const latest = data[0];
    if (!latest.is_locked) return;

    const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60 * 1000);

    const { error: updateErr } = await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease })
      .eq("id", latest.id);

    if (updateErr) return console.error(updateErr);

    getChastityStatus();
  };

  // ---------------- Apply penalties for incomplete tasks at 2AM ----------------
  window.applyIncompleteTaskPenalties = async function(supabase) {
    if (!window.currentUser) return;
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today)
      .eq("done", false);

    if (error) return console.error(error);

    let totalPenalty = 0;
    data.forEach(task => {
      if (task.difficulty === "Easy") totalPenalty += 30;
      else if (task.difficulty === "Medium") totalPenalty += 60;
      else if (task.difficulty === "Hard") totalPenalty += 180;
    });

    if (totalPenalty > 0) {
      // Apply penalty by extending release_date
      const { data: latestData, error: statusErr } = await supabase
        .from("chastityStatus")
        .select("*")
        .eq("user_id", window.currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (statusErr || !latestData || latestData.length === 0) return;

      const latest = latestData[0];
      const newRelease = new Date(new Date(latest.release_date).getTime() + totalPenalty * 60 * 1000);

      await supabase
        .from("chastityStatus")
        .update({ release_date: newRelease })
        .eq("id", latest.id);

      getChastityStatus();
    }
  };

  // ---------------- Schedule 2AM penalties ----------------
  function schedulePenaltyCheck() {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    if (now >= next2AM) next2AM.setDate(next2AM.getDate() + 1);
    const delay = next2AM - now;
    setTimeout(async () => {
      if (window.applyIncompleteTaskPenalties) await window.applyIncompleteTaskPenalties(supabase);
      schedulePenaltyCheck(); // next day
    }, delay);
  }
  schedulePenaltyCheck();

  await getChastityStatus();
  setInterval(getChastityStatus, 60_000); // refresh every minute
}
