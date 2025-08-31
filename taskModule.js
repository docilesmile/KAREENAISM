// taskModule.js
import { supabase } from './supabaseClient.js';
import { adjustChastityTime } from './chastityModule.js';

const TASKS_CONTAINER_ID = "modulesContainer";

export async function loadTasksModule(userId) {
  const container = document.getElementById(TASKS_CONTAINER_ID);
  if (!container) return;

  container.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn">Get Task</button>
    <button id="rerollBtn">Reroll Task (Forfeit)</button>
    <div id="taskList"></div>
  `;

  const getTaskBtn = document.getElementById("getTaskBtn");
  const rerollBtn = document.getElementById("rerollBtn");
  const taskListDiv = document.getElementById("taskList");

  // Load today's tasks
  async function loadTodayTasks() {
    const today = new Date();
    today.setHours(today.getHours() - 4); // 4AM reset
    const dayKey = today.toISOString().split("T")[0];

    const { data: tasks } = await supabase
      .from("rolled_tasks")
      .select("*")
      .eq("user_id", userId)
      .like("created_at", `${dayKey}%`);

    taskListDiv.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      taskListDiv.innerHTML = "No tasks for today.";
      return;
    }

    tasks.forEach(task => {
      const div = document.createElement("div");
      div.className = "task";
      div.innerHTML = `${task.task} [${task.difficulty}] - ${task.completed ? "✅ Completed" : ""}`;

      if (!task.completed) {
        const btn = document.createElement("button");
        btn.innerText = "Complete";
        btn.onclick = async () => {
          await completeTask(task);
          loadTodayTasks();
        };
        div.appendChild(btn);
      }

      taskListDiv.appendChild(div);
    });
  }

  async function completeTask(task) {
    await supabase.from("rolled_tasks")
      .update({ completed: true, completed_at: new Date() })
      .eq("id", task.id);

    // Fetch reward from PenaltyRules
    const { data: rules } = await supabase
      .from("PenaltyRules")
      .select("*")
      .eq("difficulty", task.difficulty)
      .single();

    if (rules) {
      await adjustChastityTime(userId, -rules.reward); // reduce time
    }
  }

  async function rollTask() {
    const { data: allTasks } = await supabase.from("TaskLists").select("*");
    if (!allTasks || allTasks.length === 0) return null;

    // Pick random task not already rolled today
    const todayTasks = await supabase.from("rolled_tasks").select("task").eq("user_id", userId);
    const todayTaskNames = todayTasks.data?.map(t => t.task) || [];
    const available = allTasks.filter(t => !todayTaskNames.includes(t.task));

    if (available.length === 0) {
      alert("No more tasks available today!");
      return;
    }

    const randomTask = available[Math.floor(Math.random() * available.length)];

    await supabase.from("rolled_tasks").insert({
      user_id: userId,
      task_id: randomTask.id,
      task: randomTask.task,
      difficulty: randomTask.difficulty,
      completed: false,
      created_at: new Date()
    });

    loadTodayTasks();
  }

  async function rerollTask() {
    // pick TWO new tasks as forfeit
    await rollTask();
    await rollTask();
  }

  getTaskBtn.onclick = rollTask;
  rerollBtn.onclick = rerollTask;

  loadTodayTasks();
}
