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

  const chastityStatus = document.getElementById("chastityStatus");

  async function getChastityStatus() {
    if (!window.currentUser) return;

    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .single();

    if (error || !data) {
      chastityStatus.innerText = "You are currently unlocked.";
      return;
    }

    const now = new Date();
    if (data.is_locked && new Date(data.release_date) > now) {
      chastityStatus.innerText = `You are locked until ${new Date(data.release_date).toLocaleString()}`;
    } else {
      chastityStatus.innerText = "You are currently unlocked.";
    }
  }

  await getChastityStatus();
}
