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
      const remainingMs = releaseDate - now;
      const hours = Math.floor(remainingMs / 1000 / 60 / 60);
      const minutes = Math.floor((remainingMs / 1000 / 60) % 60);
      statusP.innerText = `You are locked for ${hours}h ${minutes}m (until ${releaseDate.toLocaleString()}). Source: ${latest.source}`;
    } else {
      statusP.innerText = "You are not locked. Goddess may decide soon.";
    }
  }

  window.updateChastityByTasks = async function(difficulty) {
    if (!window.currentUser) return;
    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;

    const latest = data[0];
    if (!latest.is_locked) return;

    let reductionMinutes = 0;
    if (difficulty === "Easy") reductionMinutes = 15;
    else if (difficulty === "Medium") reductionMinutes = 30;
    else if (difficulty === "Hard") reductionMinutes = 60;

    const newRelease = new Date(new Date(latest.release_date) - reductionMinutes * 60 * 1000);

    const { error: updateErr } = await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease })
      .eq("id", latest.id);

    if (updateErr) console.error(updateErr);
    await getChastityStatus();
  }

  window.applyIncompleteTaskPenalties = async function(supabase) {
    if (!window.currentUser) return;

    const today = new Date().toISOString().split("T")[0];
    const { data: incompleteTasks, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today)
      .eq("done", false);

    if (error) return console.error(error);
    if (incompleteTasks.length === 0) return;

    const { data, error: chError } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (chError || !data || data.length === 0) return;

    const latest = data[0];
    if (!latest.is_locked) return;

    const penaltyMinutes = incompleteTasks.length * 30;
    const newRelease = new Date(new Date(latest.release_date).getTime() + penaltyMinutes * 60 * 1000);

    const { error: updateErr } = await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease })
      .eq("id", latest.id);

    if (updateErr) console.error(updateErr);
    await getChastityStatus();
  }

  await getChastityStatus();
  setInterval(getChastityStatus, 60_000);
}
