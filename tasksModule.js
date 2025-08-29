// tasksModule.js
export async function loadTasksModule(supabase, updateBegRelease) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const taskModuleDiv = document.createElement("div");
  taskModuleDiv.id = "tasksModule";
  taskModuleDiv.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn" disabled>Get Task</button>
    <div id="taskList"></div>
    <p id="taskCounter">0/5 tasks complete today</p>
  `;
  modulesContainer.innerHTML = '';
  modulesContainer.appendChild(taskModuleDiv);

  const getTaskBtn = document.getElementById("getTaskBtn");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");

  let completedCount = 0;

  // Enable button if user is logged in
  if (window.currentUser) getTaskBtn.disabled = false;

  async function loadTodayTasks() {
    if (!window.currentUser) return;

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today);
    if (error) return console.error(error);

    taskList.innerHTML = "";
    completedCount = 0;

    data.forEach(task => {
      const div = document.createElement("div");
      div.className = "task";
      div.innerText = task.text;

      if (!task.done) {
        const btn = document.createElement("button");
        btn.innerText = "Complete";
        btn.onclick = async () => {
          await supabase.from("rolled_tasks")
            .update({ done: true })
            .eq("id", task.id)
            .eq("user_id", window.currentUser.id);
          loadTodayTasks();
        };
        div.appendChild(btn);
      } else {
        div.classList.add("done");
        completedCount++;
      }

      taskList.appendChild(div);
    });

    taskCounter.innerText = `${completedCount}/5 tasks complete today`;
    updateBegRelease(completedCount);
  }

  getTaskBtn.addEventListener("click", async () => {
    if (!window.currentUser) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: rolled, error: rolledErr } = await supabase
      .from("rolled_tasks")
      .select("text")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today);
    if (rolledErr) return console.error(rolledErr);

    const rolledTasks = rolled.map(r => r.text);

    const { data: allTasks, error: allErr } = await supabase
      .from("TaskLists")
      .select("id, task");
    if (allErr) return console.error(allErr);

    const available = allTasks.filter(t => !rolledTasks.includes(t.task));
    if (available.length === 0) {
      alert("No more tasks available today!");
      return;
    }

    const randomTask = available[Math.floor(Math.random() * available.length)];

    await supabase.from("rolled_tasks").insert({
      id: randomTask.id,
      user_id: window.currentUser.id,
      text: randomTask.task,
      done: false,
      day_key: today,
      created_at: new Date()
    });

    loadTodayTasks();
  });

  loadTodayTasks();
}
