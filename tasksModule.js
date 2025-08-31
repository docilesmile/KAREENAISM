export async function loadTasksModule(supabase, updateBegRelease) {
  const modulesContainer = document.getElementById("modulesContainer");
  const taskModuleDiv = document.createElement("div");
  taskModuleDiv.id = "tasksModule";
  taskModuleDiv.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn" disabled>Get Task</button>
    <div id="taskList">Loading tasks...</div>
    <p id="taskCounter">0/5 tasks complete today</p>
  `;
  modulesContainer.appendChild(taskModuleDiv);

  const getTaskBtn = document.getElementById("getTaskBtn");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");

  let completedCount = 0;

  const enableTaskButton = () => { if(window.currentUser) getTaskBtn.disabled = false; };
  enableTaskButton();

  async function loadTodayTasks() {
    if(!window.currentUser) return;
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today);

    if(error) return console.error(error);
    taskList.innerHTML = "";
    completedCount = 0;

    data.forEach(task => {
      const div = document.createElement("div");
      div.className = "task";
      div.innerText = `${task.text} [${task.difficulty || "Easy"}]`;

      if(!task.done) {
        const btn = document.createElement("button");
        btn.innerText = "Complete";
        btn.onclick = async () => { await markTaskComplete(task.id, task.difficulty); };
        const rerollBtn = document.createElement("button");
        rerollBtn.innerText = "Reroll";
        rerollBtn.onclick = async () => { await rerollTask(task.id); };
        div.appendChild(btn);
        div.appendChild(rerollBtn);
      } else {
        div.classList.add("done");
        completedCount++;
      }

      taskList.appendChild(div);
    });

    taskCounter.innerText = `${completedCount}/5 tasks complete today`;
    if(updateBegRelease) updateBegRelease(completedCount);
  }

  async function markTaskComplete(taskId, difficulty) {
    if(!window.currentUser) return;

    await supabase.from("rolled_tasks").update({ done:true }).eq("id", taskId);
    if(window.reduceTimeForTask) {
      let minutes = 0;
      if(difficulty === "Easy") minutes=60;
      else if(difficulty==="Medium") minutes=120;
      else if(difficulty==="Hard") minutes=300;
      await window.reduceTimeForTask(minutes);
    }

    loadTodayTasks();
  }

  async function rerollTask(taskId) {
    const today = new Date().toISOString().split("T")[0];

    const { data: allTasks } = await supabase.from("TaskLists").select("*");
    if(!allTasks) return;

    // pick two random tasks for forfeit
    const shuffled = allTasks.sort(()=>0.5-Math.random()).slice(0,2);
    for(const t of shuffled) {
      await supabase.from("rolled_tasks").insert({
        user_id: window.currentUser.id,
        text: t.task,
        done:false,
        difficulty: t.difficulty || "Easy",
        day_key: today,
        created_at: new Date()
      });
    }

    // remove old task
    await supabase.from("rolled_tasks").delete().eq("id", taskId);

    loadTodayTasks();
  }

  getTaskBtn.addEventListener("click", async () => {
    if(!window.currentUser) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: rolled } = await supabase.from("rolled_tasks").select("text").eq("user_id", window.currentUser.id).eq("day_key", today);
    const rolledTasks = rolled.map(r=>r.text);

    const { data: allTasks } = await supabase.from("TaskLists").select("*");
    const available = allTasks.filter(t=>!rolledTasks.includes(t.task));
    if(available.length===0){ alert("No more tasks available today!"); return; }

    const randomTask = available[Math.floor(Math.random()*available.length)];
    await supabase.from("rolled_tasks").insert({
      user_id: window.currentUser.id,
      text: randomTask.task,
      done:false,
      difficulty: randomTask.difficulty || "Easy",
      day_key: today,
      created_at: new Date()
    });

    loadTodayTasks();
  });

  loadTodayTasks();
  document.addEventListener("userLoggedIn", enableTaskButton);
}
