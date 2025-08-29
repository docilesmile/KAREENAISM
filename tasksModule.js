// tasksModule.js

export function loadTasksModule() {
  const getTaskBtn = document.getElementById("getTask");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");
  const begReleaseBtn = document.getElementById("begRelease");
  let completedCount = 0;

  if (!window.currentUser) {
    console.error("No currentUser set. Make sure you call loadTasksModule() after login.");
    return;
  }

  const currentUser = window.currentUser;

  // ---------------- Tasks ----------------
  async function loadTodayTasks() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", currentUser.id)
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
    if (begReleaseBtn) begReleaseBtn.disabled = completedCount < 5;
  }

  async function markTaskComplete(taskId) {
    const { error } = await supabase
      .from("rolled_tasks")
      .update({ done: true })
      .eq("id", taskId)
      .eq("user_id", currentUser.id);
    if (error) return console.error(error);
    loadTodayTasks();
  }

  if (getTaskBtn) {
    getTaskBtn.disabled = false;
    getTaskBtn.addEventListener("click", async () => {
      const today = new Date().toISOString().split("T")[0];

      // fetch today's rolled tasks
      const { data: rolled, error: rolledErr } = await supabase
        .from("rolled_tasks")
        .select("text")
        .eq("user_id", currentUser.id)
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
          user_id: currentUser.id,
          text: randomTask.task,
          done: false,
          day_key: today,
          created_at: new Date()
        });
      if (insertErr) return console.error(insertErr);

      loadTodayTasks();
    });
  }

  // Load tasks immediately after module initialization
  loadTodayTasks();
}
