export async function loadTasksModule(supabase, updateBegRelease) {
  if(!supabase) throw new Error("Supabase client required.");
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

  const enableTaskButton = () => { if(window.currentUser) getTaskBtn.disabled=false; };
  enableTaskButton();

  async function loadTodayTasks() {
    if(!window.currentUser) return;
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.from("rolled_tasks")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .eq("day_key", today);

    if(error){ console.error(error); taskList.innerHTML="Error loading tasks"; return; }

    taskList.innerHTML=""; completedCount=0;

    (data||[]).forEach(task=>{
      const div=document.createElement("div"); div.className="task";
      div.innerText=`${task.text} [${task.difficulty||"Easy"}]`;
      if(!task.done){
        const completeBtn=document.createElement("button"); completeBtn.innerText="Complete";
        completeBtn.onclick=async()=>{ await markTaskComplete(task.id, task.difficulty); };
        div.appendChild(completeBtn);

        const rerollBtn=document.createElement("button"); rerollBtn.innerText="Reroll (forfeit)";
        rerollBtn.onclick=async()=>{ await rerollTask(task.id); };
        div.appendChild(rerollBtn);
      } else { div.classList.add("done"); completedCount++; }
      taskList.appendChild(div);
    });
    taskCounter.innerText=`${completedCount}/5 tasks complete today`;
    if(updateBegRelease) updateBegRelease(completedCount);
  }

  async function markTaskComplete(taskId,difficulty){
    if(!window.currentUser) return;
    await supabase.from("rolled_tasks").update({done:true})
      .eq("id",taskId).eq("user_id",window.currentUser.id);
    let minutes=0;
    if(difficulty==="Easy") minutes=60;
    else if(difficulty==="Medium") minutes=120;
    else if(difficulty==="Hard") minutes=300;
    if(window.reduceTimeForTask) await window.reduceTimeForTask(minutes);
    loadTodayTasks();
  }

  async function rerollTask(taskId){
    if(!window.currentUser) return;
    const today=new Date().toISOString().split("T")[0];

    const { data: allTasks } = await supabase.from("TaskLists").select("id,task,difficulty");
    const { data: rolled } = await supabase.from("rolled_tasks").select("text")
      .eq("user_id",window.currentUser.id).eq("day_key",today);
    const rolledTexts = rolled?.map(r=>r.text)||[];

    const available = allTasks.filter(t=>!rolledTexts.includes(t.task));
    if(available.length===0){ alert("No more tasks to reroll!"); return; }

    const newTasks=[]; for(let i=0;i<2;i++){
      if(available.length===0) break;
      const rand=Math.floor(Math.random()*available.length);
      newTasks.push(available.splice(rand,1)[0]);
    }

    await supabase.from("rolled_tasks").delete().eq("id",taskId).eq("user_id",window.currentUser.id);

    for(const t of newTasks){
      await supabase.from("rolled_tasks").insert({
        user_id:window.currentUser.id,
        text:t.task,
        difficulty:t.difficulty||"Easy",
        done:false,
        day_key:today,
        created_at:new Date()
      });
    }

    loadTodayTasks();
  }

  getTaskBtn.addEventListener("click", async()=>{
    if(!window.currentUser) return;
    const today=new Date().toISOString().split("T")[0];

    const { data: rolled } = await supabase.from("rolled_tasks")
      .select("text").eq("user_id",window.currentUser.id).eq("day_key",today);
    const rolledTexts = rolled?.map(r=>r.text)||[];

    const { data: allTasks } = await supabase.from("TaskLists").select("id,task,difficulty");
    const available = allTasks.filter(t=>!rolledTexts.includes(t.task));
    if(available.length===0){ alert("No more tasks available today!"); return; }

    const randomTask = available[Math.floor(Math.random()*available.length)];

    await supabase.from("rolled_tasks").insert({
      user_id:window.currentUser.id,
      text:randomTask.task,
      difficulty:randomTask.difficulty||"Easy",
      done:false,
      day_key:today,
      created_at:new Date()
    });

    loadTodayTasks();
  });

  loadTodayTasks();
  document.addEventListener("userLoggedIn", enableTaskButton);
}
