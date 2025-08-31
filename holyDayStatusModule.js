export async function loadHolyDayStatusModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const holyDiv = document.createElement("div");
  holyDiv.id = "holyDayStatusModule";
  holyDiv.innerHTML = `<h2>Upcoming Holy Day</h2><div id="holyDayList">Loading...</div>`;
  modulesContainer.appendChild(holyDiv);

  const holyDayList = document.getElementById("holyDayList");
  const today = new Date();
  const birthday = new Date(today.getFullYear(), 8, 21); // 21 Sep
  const diffDays = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));

  holyDayList.innerHTML = `<p>Goddess KAREENA Birthday on ${birthday.toLocaleDateString()} (in ${diffDays} days)</p>`;
}
