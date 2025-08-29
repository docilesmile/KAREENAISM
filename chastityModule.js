// chastityModule.js
export async function loadChastityModule() {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `
    <h2>Chastity Status</h2>
    <p id="lockStatus">Loading...</p>
    <p id="lockCountdown"></p>
  `;
  modulesContainer.appendChild(chastityDiv);

  const lockStatus = document.getElementById("lockStatus");
  const lockCountdown = document.getElementById("lockCountdown");

  // ---------------- Constants ----------------
  const lockDurations = {
    short: 1,      // 1-2 days
    medium: 3,     // 3-5 days
    long: 7,       // 1 week
    extended: 14,  // 2 weeks
  };

  const mandatedPeriods = [
    {
      name: "Goddess KAREENA's Birthday",
      start: "2025-09-14", // 1 week lead-up
      end: "2025-09-21",
      lockType: "extended"
    },
    // Add more mandated periods here
  ];

  // ---------------- Functions ----------------
  function daysBetween(date1, date2) {
    const diffTime = date2 - date1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async function getChastityStatus() {
    if (!window.currentUser) return;

    // Check database
    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return console.error(error);

    let status = data && data.length ? data[0] : null;

    // Check mandated periods
    const today = new Date();
    for (let period of mandatedPeriods) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      if (today >= start && today <= end) {
        status = {
          is_locked: true,
          release_date: end.toISOString(),
          source: "Mandated by Goddess KAREENA"
        };
        break;
      }
    }

    if (!status) {
      lockStatus.innerText = "You are not locked. Serve Goddess KAREENA faithfully!";
      lockCountdown.innerText = "";
      return;
    }

    // Update UI
    lockStatus.innerText = status.is_locked
      ? `You are locked! Release by ${new Date(status.release_date).toLocaleString()} (Source: ${status.source})`
      : "You are not locked. Serve Goddess KAREENA faithfully!";

    updateCountdown(new Date(status.release_date));
  }

  function updateCountdown(releaseDate) {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = releaseDate - now;

      if (diff <= 0) {
        clearInterval(interval);
        lockStatus.innerText = "You are now free! Serve Goddess KAREENA well.";
        lockCountdown.innerText = "";
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      lockCountdown.innerText = `Time remaining: ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
  }

  // Initial load
  getChastityStatus();

  // Refresh when user logs in
  document.addEventListener("userLoggedIn", getChastityStatus);
}
