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

  const LOCK_TIMES = {
    short: 2,      // days
    medium: 5,     // days
    long: 7,       // days
    extended: 14,  // days
  };

  const MANDATED_LOCKS = [
    { month: 9, day: 21, name: "Goddess KAREENA's Birthday", days: 7 }, // example
  ];

  async function getChastityStatus() {
    if (!window.currentUser) return;

    // Fetch latest status
    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return console.error(error);

    const now = new Date();
    let latest = data && data.length > 0 ? data[0] : null;

    // Check mandated locks
    const today = new Date();
    const mandatedToday = MANDATED_LOCKS.find(d => d.month === today.getMonth() + 1 && d.day === today.getDate());
    if (mandatedToday && (!latest || !latest.is_locked || new Date(latest.release_date) < now)) {
      await lockUser("mandated", mandatedToday.days, mandatedToday.name);
      latest = (await supabase.from("chastityStatus").select("*").eq("user_id", window.currentUser.id).order('created_at', { ascending: false }).limit(1)).data[0];
    }

    if (!latest) {
      statusP.innerText = "You are not locked. Goddess has not dictated your chastity yet.";
      return;
    }

    const releaseDate = new Date(latest.release_date);
    if (latest.is_locked && releaseDate > now) {
      statusP.innerText = `You are locked until ${releaseDate.toLocaleString()}. Source: ${latest.source}`;
    } else {
      statusP.innerText = "You are not locked. Goddess may decide soon.";
    }
  }

  async function lockUser(source = "Goddess decision", days = 1, note = "") {
    if (!window.currentUser) return;

    const now = new Date();
    const releaseDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("chastityStatus").insert({
      user_id: window.currentUser.id,
      is_locked: true,
      release_date: releaseDate.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      source: note ? `${source} (${note})` : source
    });

    if (error) return console.error(error);
  }

  async function unlockUser(source = "Goddess decision") {
    if (!window.currentUser) return;

    const now = new Date();
    const { error } = await supabase.from("chastityStatus").insert({
      user_id: window.currentUser.id,
      is_locked: false,
      release_date: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      source
    });

    if (error) return console.error(error);
  }

  // Random Goddess penalties
  async function applyRandomPenalty() {
    if (Math.random() < 0.05) { // 5% chance
      await lockUser("Goddess penalty", 1, "Random surprise from Goddess KAREENA");
    }
  }

  // Task penalties/rewards
  window.updateChastityByTasks = async function(taskData) {
    // taskData = { difficulty: "Easy"|"Medium"|"Hard", done: true|false }
    if (!taskData || !taskData.length) return;
    let totalChange = 0;
    taskData.forEach(t => {
      if (t.done) {
        if (t.difficulty === "Easy") totalChange -= 0.1;
        if (t.difficulty === "Medium") totalChange -= 0.25;
        if (t.difficulty === "Hard") totalChange -= 0.5;
      } else {
        if (t.difficulty === "Easy") totalChange += 0.2;
        if (t.difficulty === "Medium") totalChange += 0.5;
        if (t.difficulty === "Hard") totalChange += 1;
      }
    });
    if (totalChange !== 0) {
      const latest = (await supabase.from("chastityStatus").select("*").eq("user_id", window.currentUser.id).order('created_at', { ascending: false }).limit(1)).data[0];
      if (!latest || !latest.is_locked) return;
      const currentRelease = new Date(latest.release_date);
      const newRelease = new Date(currentRelease.getTime() + totalChange * 24*60*60*1000);
      const { error } = await supabase.from("chastityStatus").insert({
        user_id: window.currentUser.id,
        is_locked: true,
        release_date: newRelease.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "Task impact adjustment"
      });
      if (error) console.error(error);
    }
  };

  await getChastityStatus();
  setInterval(async () => { await getChastityStatus(); await applyRandomPenalty(); }, 60_000); // refresh every minute
}
