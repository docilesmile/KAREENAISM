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
      statusP.innerText = `You are locked until ${releaseDate.toLocaleString()}. Source: ${latest.source}`;
    } else {
      statusP.innerText = "You are not locked. Goddess may decide soon.";
    }
  }

  await getChastityStatus();
  setInterval(getChastityStatus, 60_000); // refresh every minute
}
