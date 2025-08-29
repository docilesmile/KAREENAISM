// tasksModule.js
export async function loadTasksModule(supabase, updateBegRelease) {
  if (!supabase) throw new Error("Supabase client must be passed into tasksModule");
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const taskModuleDiv = document.createElement("div");
  taskModuleDiv.id = "tasksModule";
  taskModuleDiv.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn" disabled>Get Task</button>
    <div id="taskList">Loading tasks...</div>
    <p id="taskCounter">0/5 tasks complete today</p>
  `;
  modulesContainer.innerHTML = '';
  modulesContainer.appendChild(taskModuleDiv);

  const getTaskBtn = document.getElementById("getTaskBtn");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");

  let completedCount = 0;

  const enableTaskButton = () => {
    if (window.currentUser) getTaskBtn.disabled = false;
  };
  enableTaskButton();

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
        btn.onclick = () => markTaskComplete(task.id, task.difficulty);
        div.appendChild(btn);
      } else {
        div.classList.add("done");
        completedCount++;
      }
      taskList.appendChild(div);
    });

    taskCounter.innerText = `${completedCount}/5 tasks complete today`;
    if (updateBegRelease) updateBegRelease(completedCount);
  }

  async function markTaskComplete(taskId, difficulty) {
    if (!window.currentUser) return;

    const { error } = await supabase
      .from("rolled_tasks")
      .update({ done: true })
      .eq("id", taskId)
      .eq("user_id", window.currentUser.id);

    if (error) return console.error(error);

    // Reduce chastity time based on difficulty
    if (window.updateChastityByTasks) window.updateChastityByTasks(difficulty);

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
      .select("id, task, category, difficulty");

    if (allErr) return console.error(allErr);

    // pick random unrolled task
    const available = allTasks.filter(t => !rolledTasks.includes(t.task));
    if (available.length === 0) {
      alert("No more tasks available today!");
      return;
    }
    const randomTask = available[Math.floor(Math.random() * available.length)];

    const { error: insertErr } = await supabase
      .from("rolled_tasks")
      .insert({
        user_id: window.currentUser.id,
        text: randomTask.task,
        difficulty: randomTask.difficulty,
        done: false,
        day_key: today,
        created_at: new Date()
      });

    if (insertErr) return console.error(insertErr);
    loadTodayTasks();
  });

  // ---------------- Schedule 2AM incomplete task penalties ----------------
  function schedulePenaltyCheck() {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    if (now >= next2AM) next2AM.setDate(next2AM.getDate() + 1);
    const delay = next2AM - now;
    setTimeout(async () => {
      if (window.applyIncompleteTaskPenalties) await window.applyIncompleteTaskPenalties(supabase);
      schedulePenaltyCheck(); // schedule next day
    }, delay);
  }
  schedulePenaltyCheck();

  loadTodayTasks();
  document.addEventListener("userLoggedIn", enableTaskButton);
}
