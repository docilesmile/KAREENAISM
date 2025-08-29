// ---------------- Tasks Module ----------------

// Assumes the following elements exist in index.html:
// getTaskBtn, taskList, taskCounter, currentUser, begReleaseBtn
// Assumes Supabase client 'supabase' is already initialized

let completedCount = 0;

async function loadTodayTasks() {
  if (!currentUser) return;

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
  begReleaseBtn.disabled = completedCount < 5;
}

async function getTask() {
  if (!currentUser) return;

  const today = new Date().toISOString().split("T")[0];

  // Fetch today's rolled tasks
  const { data: rolled, error: rolledErr } = await supabase
    .from("rolled_tasks")
    .select("text")
    .eq("user_id", currentUser.id)
    .eq("day_key", today);
  if (rolledErr) return console.error(rolledErr);

  const rolledTasks = rolled.map(r => r.text);

  // Fetch all tasks
  const { data: allTasks, error: allErr } = await supabase
    .from("TaskLists")
    .select("id, task");
  if (allErr) return console.error(allErr);

  // Pick a random unrolled task
  const available = allTasks.filter(t => !rolledTasks.includes(t.task));
  if (available.length === 0) {
    alert("No more tasks available today!");
    return;
  }

  const randomTask = available[Math.floor(Math.random() * available.length)];

  // Insert into rolled_tasks
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

// ---------------- Button Listeners ----------------
getTaskBtn.addEventListener("click", getTask);

// Expose functions globally if needed
window.loadTodayTasks = loadTodayTasks;
window.markTaskComplete = markTaskComplete;
