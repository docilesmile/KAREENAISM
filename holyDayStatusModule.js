// holyDayStatusModule.js
export async function loadHolyDayStatusModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const holyDiv = document.createElement("div");
  holyDiv.id = "holyDayStatusModule";
  holyDiv.innerHTML = `<h2>Upcoming Holy Days</h2><div id="holyDayList">Loading...</div>`;
  modulesContainer.appendChild(holyDiv);

  const holyDayList = document.getElementById("holyDayList");

  const today = new Date();
  const birthday = new Date(today.getFullYear(), 8, 21); // 21 Sep

  const birthdayWeek = [];
  for (let i = -7; i <= 0; i++) {
    const d = new Date(birthday);
    d.setDate(d.getDate() + i);
    birthdayWeek.push(d);
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const daysUntil = d => Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  let html = `<ul>`;
  html += `<li>Birthday Week (${formatDate(birthdayWeek[0])} - ${formatDate(birthdayWeek[birthdayWeek.length - 1])}) (in ${daysUntil(birthdayWeek[0])} days)</li>`;
  html += `<li>Goddess KAREENA Birthday on ${formatDate(birthday)} (in ${daysUntil(birthday)} days)</li>`;
  html += `</ul>`;

  holyDayList.innerHTML = html;
}
