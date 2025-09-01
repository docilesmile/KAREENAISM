// chastityModule.js
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);

  const statusP = document.getElementById("chastityStatus");

  async function getChastityStatus() {
    if (!window.currentUser) return;
    const { data } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      statusP.innerText = "You are not locked.";
      return;
    }

    const latest = data[0];
    const now = new Date();
    const release = new Date(latest.release_date);

    if (latest.is_locked && release > now) {
      statusP.innerText = `Locked until ${release.toLocaleString()}.`;
    } else {
      statusP.innerText = "You are not locked.";
    }
  }

  async function reduceTimeForTask(minutes) {
    if (!window.currentUser) return;
    const { data } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return;
    const latest = data[0];
    if (!latest.is_locked) return;

    const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60 * 1000);
    await supabase
      .from("chastityStatus")
      .update({ release_date: newRelease.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", latest.id);

    getChastityStatus();
  }

  async function attemptBegRelease(releaseOutputEl = null) {
    if (!window.currentUser) return;
    const { data } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      if (releaseOutputEl) releaseOutputEl.innerText = "No chastity status found.";
      return alert("No chastity status found.");
    }

    const latest = data[0];
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

      const message = "Mercy granted... Goddess KAREENA releases you.";
      if (releaseOutputEl) releaseOutputEl.innerText = message;
      alert(message);
    } else {
      // FAILURE: +24 hours
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

      const message = "Your begging displeased Goddess KAREENA. +24 hours added.";
      if (releaseOutputEl) releaseOutputEl.innerText = message;
      alert(message);
    }

    getChastityStatus();
  }

  window.reduceTimeForTask = reduceTimeForTask;
  window.attemptBegRelease = attemptBegRelease;

  await getChastityStatus();
  setInterval(getChastityStatus, 60000);

  return { reduceTimeForTask, attemptBegRelease };
}
