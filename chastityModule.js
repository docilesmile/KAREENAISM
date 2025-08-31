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

  async function getChastityStatus() {
    if (!window.currentUser) return;

    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching chastity status:", error);
      return;
    }
    if (!data || data.length === 0) {
      statusP.innerText = "You are not locked. Goddess has not dictated your chastity yet.";
      return;
    }

    const latest = data[0];
    const now = new Date();
    const releaseDate = new Date(latest.release_date);

    if (latest.is_locked && releaseDate > now) {
      const remainingMs = releaseDate - now;
      const remaining = {
        days: Math.floor(remainingMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((remainingMs / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((remainingMs / (1000 * 60)) % 60),
      };

      statusP.innerText = `
Locked until ${releaseDate.toLocaleString()}.
Remaining: ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m.
Source: ${latest.source || "Goddess KAREENA"}
Total reduced: ${latest.total_reduced || 0} minutes
Total added: ${latest.total_added || 0} minutes
      `;
    } else {
      statusP.innerText = "You are not locked. Goddess may decide soon.";
    }
  }

  // Reduce chastity time
  window.reduceTimeForTask = async function (minutes) {
    if (!window.currentUser) return;

    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error("Error fetching chastity status for reduction:", error);
      return;
    }
    const latest = data[0];
    if (!latest.is_locked) return;

    const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60 * 1000);

    await supabase
      .from("chastityStatus")
      .update({
        release_date: newRelease,
        total_reduced: (latest.total_reduced || 0) + minutes,
      })
      .eq("id", latest.id);

    getChastityStatus();
  };

  // Penalty check at 2AM
  window.applyIncompleteTaskPenalties = async function (supabase) {
    if (!window.currentUser) return;

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today)
      .eq("done", false);

    if (error) {
      console.error("Error fetching incomplete tasks:", error);
      return;
    }

    if (!data || data.length === 0) return;

    let totalPenalty = 0;
    data.forEach(task => {
      if (task.difficulty === "Easy") totalPenalty += 30;
      else if (task.difficulty === "Medium") totalPenalty += 60;
      else if (task.difficulty === "Hard") totalPenalty += 180;
    });

    if (totalPenalty > 0) {
      const { data: latestData, error: statusErr } = await supabase
        .from("chastityStatus")
        .select("*")
        .eq("user_id", window.currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (statusErr || !latestData || latestData.length === 0) {
        console.error("Error fetching chastity status for penalty:", statusErr);
        return;
      }

      const latest = latestData[0];
      const newRelease = new Date(new Date(latest.release_date).getTime() + totalPenalty * 60 * 1000);

      await supabase
        .from("chastityStatus")
        .update({
          release_date: newRelease,
          total_added: (latest.total_added || 0) + totalPenalty,
        })
        .eq("id", latest.id);

      console.log(`Chastity release date extended by ${totalPenalty} minutes.`);
      getChastityStatus();
    }
  };

  function schedulePenaltyCheck() {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    if (now >= next2AM) next2AM.setDate(next2AM.getDate() + 1);
    const delay = next2AM - now;
    setTimeout(async () => {
      if (window.applyIncompleteTaskPenalties) await window.applyIncompleteTaskPenalties(supabase);
      schedulePenaltyCheck();
    }, delay);
  }

  schedulePenaltyCheck();

  await getChastityStatus();
  setInterval(getChastityStatus, 60_000); // refresh every minute
}
