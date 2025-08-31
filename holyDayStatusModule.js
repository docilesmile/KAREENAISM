// holyDayStatusModule.js
export async function loadHolyDayStatusModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  const holyDiv = document.createElement("div");
  holyDiv.id = "holyDayStatusModule";
  holyDiv.innerHTML = `
    <h2>Goddess KAREENA Status</h2>
    <p id="currentLockStatus">Loading lock status...</p>
    <p id="timeRemaining"></p>
    <h3>Upcoming Holy Days</h3>
    <ul id="holyDayList">Loading...</ul>
  `;
  modulesContainer.appendChild(holyDiv);

  const currentLockStatus = document.getElementById("currentLockStatus");
  const timeRemaining = document.getElementById("timeRemaining");
  const holyDayList = document.getElementById("holyDayList");

  const HOLY_DAYS = [
    { name: "Goddess KAREENA Birthday", month: 9, day: 21 },
    ...Array.from({ length: 7 }, (_, i) => ({ name: `Birthday Week`, month: 9, day: 14 + i }))
  ];

  async function updateStatus() {
    if (!window.currentUser) return;

    // Fetch latest chastity status
    const { data } = await supabase.from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    let statusText = "You are not locked.";
    let remainingText = "";
    if (data && data.length > 0) {
      const latest = data[0];
      if (latest.is_locked) {
        const now = new Date();
        const release = new Date(latest.release_date);
        const diffMs = release - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
        statusText = `Locked by Goddess KAREENA until ${release.toLocaleString()} (Source: ${latest.source || "Her will"})`;
        remainingText = `Time remaining: ${days}d ${hours}h ${minutes}m`;
      }
    }
    currentLockStatus.innerText = statusText;
    timeRemaining.innerText = remainingText;

    // Upcoming Holy Days
    const today = new Date();
    const upcoming = HOLY_DAYS
      .map(d => {
        const year = today.getMonth() > d.month-1 || (today.getMonth() === d.month-1 && today.getDate() > d.day) ? today.getFullYear()+1 : today.getFullYear();
        const date = new Date(year, d.month - 1, d.day);
        const diffMs = date - today;
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { ...d, date, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    holyDayList.innerHTML = "";
    upcoming.forEach(h => {
      const li = document.createElement("li");
      li.innerText = `${h.name} on ${h.date.toLocaleDateString()} (in ${h.daysUntil} days)`;
      holyDayList.appendChild(li);
    });
  }

  await updateStatus();
  setInterval(updateStatus, 60_000); // refresh every minute
}
