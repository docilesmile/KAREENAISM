// tasksModule.js
export async function loadTasksModule() {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  // Create module UI
  const taskModuleDiv = document.createElement("div");
  taskModuleDiv.id = "tasksModule";
  taskModuleDiv.innerHTML = `
    <h2>Daily Tasks</h2>
    <button id="getTaskBtn" disabled>Get Task</button>
    <div id="taskList"></div>
    <p id="taskCounter">0/5 tasks complete today</p>
  `;
  modulesContainer.innerHTML = ""; // clear placeholder
  modulesContainer.appendChild(taskModuleDiv);

  const getTaskBtn = document.getElementById("getTaskBtn");
  const taskList = document.getElementById("taskList");
  const taskCounter = document.getElementById("taskCounter");

  let completedCount = 0;
  let drawnCount = 0;

  // Example set of tasks for now (replace with Supabase fetch later)
  const tasks = [
    { task: "Recite a mantra 33 times", category: "devotion", difficulty: "easy" },
    { task: "Write a praise to Goddess KAREENA", category: "worship", difficulty: "medium" },
    { task: "Spend 10 minutes in reflection on Her Feet", category: "humiliation", difficulty: "hard" }
  ];

  // Enable button once tasks are available
  if (tasks.length > 0) {
    getTaskBtn.disabled = false;
  }

  // Handle "Get Task" click
  getTaskBtn.addEventListener("click", () => {
    if (drawnCount >= 5) {
      alert("You’ve already drawn 5 tasks today.");
      return;
    }

    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];

    const taskItem = document.createElement("div");
    taskItem.className = "taskItem";
    taskItem.innerHTML = `
      <p>${randomTask.task} <em>(${randomTask.category}, ${randomTask.difficulty})</em></p>
      <button class="completeBtn">Complete</button>
    `;

    const completeBtn = taskItem.querySelector(".completeBtn");
    completeBtn.addEventListener("click", () => {
      if (!taskItem.classList.contains("completed")) {
        taskItem.classList.add("completed");
        completeBtn.disabled = true;
        completedCount++;
        taskCounter.textContent = `${completedCount}/5 tasks complete today`;
      }
    });

    taskList.appendChild(taskItem);
    drawnCount++;
  });
}
