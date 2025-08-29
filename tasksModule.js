// tasksModule.js

async function loadTasksModule() {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  // Create Tasks Module container
  const taskModuleDiv = document.createElement("div");
  taskModuleDiv.id = "tasksModule";
  taskModuleDiv.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn" disabled>Get Task</button>
    <div id="taskList"></div>
    <p id="taskCounter">0/5 tasks complete today</p>
  `;
  modulesContainer.appendChild(taskModuleDiv);

  const getTaskBtn = document.getElementById("getTaskBtn");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");

  let completedCount = 0;

  // Enable button once user is logged in
  const enableTaskButton = () => {
    if (window.currentUser) getTaskBtn.disabled = false;
  };

  enableTaskButton();

  // ---------------- Tasks ----------------
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
        btn.onclick = () => markTaskComplete(task.id);
        div.appendChild(btn);
      } else {
        div.classList.add("done");
        completedCount++;
      }
      taskList.appendChild(div);
    });

    taskCounter.innerText = `${completedCount}/5 tasks complete today`;
  }

  async function markTaskComplete(taskId) {
    if (!window.currentUser) return;
    const { error } = await supabase
      .from("rolled_tasks")
      .update({ done: true })
      .eq("id", taskId)
      .eq("user_id", window.currentUser.id);
    if (error) return console.error(error);
    loadTodayTasks();
  }

  getTaskBtn.addEventListener("click", async () => {
    if (!window.currentUser) return;
    const today = new Date().toISOString().split("T")[0];

    // fetch today's rolled tasks
    const { data: rolled, error: rolledErr } = await supabase
      .from("rolled_tasks")
      .select("text")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today);
    if (rolledErr) return console.error(rolledErr);

    const rolledTasks = rolled.map(r => r.text);

    // fetch all tasks
    const { data: allTasks, error: allErr } = await supabase
      .from("TaskLists")
      .select("id, task");
    if (allErr) return console.error(allErr);

    // pick random unrolled task
    const available = allTasks.filter(t => !rolledTasks.includes(t.task));
    if (available.length === 0) {
      alert("No more tasks available today!");
      return;
    }
    const randomTask = available[Math.floor(Math.random() * available.length)];

    // insert into rolled_tasks
    const { error: insertErr } = await supabase
      .from("rolled_tasks")
      .insert({
        id: randomTask.id,
        user_id: window.currentUser.id,
        text: randomTask.task,
        done: false,
        day_key: today,
        created_at: new Date()
      });
    if (insertErr) return console.error(insertErr);

    loadTodayTasks();
  });

  // Refresh tasks when user logs in
  document.addEventListener("userLoggedIn", enableTaskButton);
}

loadTasksModule();
