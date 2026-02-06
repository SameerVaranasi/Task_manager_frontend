const API_BASE = "http://localhost:5000/api"; // change after deployment

// ---------- SAFE SELECTOR ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- AUTH API ----------
async function registerUser(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });
  return res.json();
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

// ---------- TASK API ----------
async function fetchTasks(token, status = "All", search = "") {
  const url = `${API_BASE}/tasks?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function createTask(token, task) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(task)
  });
  return res.json();
}

async function updateTask(token, id, updates) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return res.json();
}

async function deleteTask(token, id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// ---------- Helpers ----------
function getToken() {
  return localStorage.getItem("token");
}
function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

function statusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "In Progress") return "progress";
  return "completed";
}

// ================== AUTH PAGE ==================
const loginTab = $("loginTab");
const registerTab = $("registerTab");

const loginForm = $("loginForm");
const registerForm = $("registerForm");

const authMsg = $("authMsg");

if (loginTab && registerTab && loginForm && registerForm) {
  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.add("active-form");
    registerForm.classList.remove("active-form");
    if (authMsg) authMsg.textContent = "";
  });

  registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.add("active-form");
    loginForm.classList.remove("active-form");
    if (authMsg) authMsg.textContent = "";
  });
}

// Register
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value.trim();

    const data = await registerUser(name, email, password);

    if (!data || data.error || (data.message && data.message.includes("exists"))) {
      if (authMsg) {
        authMsg.style.color = "red";
        authMsg.textContent = data?.message || "Register failed";
      }
      return;
    }

    if (authMsg) {
      authMsg.style.color = "green";
      authMsg.textContent = "✅ Registered! Now login.";
    }

    registerForm.reset();
    if (loginTab) loginTab.click();
  });
}

// Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value.trim();

    const data = await loginUser(email, password);

    if (!data || !data.token) {
      if (authMsg) {
        authMsg.style.color = "red";
        authMsg.textContent = data?.message || "Login failed";
      }
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = "dashboard.html";
  });
}

// ================== DASHBOARD PAGE ==================
const userWelcome = $("userWelcome");
const logoutBtn = $("logoutBtn");

const taskForm = $("taskForm");
const taskList = $("taskList");
const taskMsg = $("taskMsg");

const filterStatus = $("filterStatus");
const searchTitle = $("searchTitle");
const applyFilters = $("applyFilters");

async function renderTasks() {
  const token = getToken();
  if (!token || !taskList) return;

  const status = filterStatus ? filterStatus.value : "All";
  const search = searchTitle ? searchTitle.value.trim() : "";

  const tasks = await fetchTasks(token, status, search);

  taskList.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    taskList.innerHTML = "<p style='color:gray;text-align:center'>No tasks found.</p>";
    return;
  }

  tasks.forEach((t) => {
    const div = document.createElement("div");
    div.className = "task";

    div.innerHTML = `
      <h4>${t.title}</h4>
      <p>${t.description}</p>
      <span class="badge ${statusClass(t.status)}">${t.status}</span>

      <div class="task-actions">
        <button class="edit-btn" onclick="editTask(${t.id})">Edit</button>
        <button class="del-btn" onclick="removeTask(${t.id})">Delete</button>
      </div>
    `;

    taskList.appendChild(div);
  });
}

// Dashboard init
if (userWelcome) {
  const user = getUser();
  const token = getToken();

  if (!user || !token) {
    logout();
  } else {
    userWelcome.textContent = `Hi, ${user.name}`;
    renderTasks();
  }
}

// Apply filters
if (applyFilters) {
  applyFilters.addEventListener("click", renderTasks);
}

// Add task
if (taskForm) {
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getToken();

    const title = $("taskTitle").value.trim();
    const description = $("taskDescription").value.trim();
    const status = $("taskStatus").value;

    const created = await createTask(token, { title, description, status });

    if (!created || created.error) {
      if (taskMsg) {
        taskMsg.style.color = "red";
        taskMsg.textContent = "❌ Task create failed";
      }
      return;
    }

    taskForm.reset();
    if (taskMsg) {
      taskMsg.style.color = "green";
      taskMsg.textContent = "✅ Task added!";
      setTimeout(() => (taskMsg.textContent = ""), 1200);
    }

    renderTasks();
  });
}

// Delete
window.removeTask = async function (id) {
  const token = getToken();
  await deleteTask(token, id);
  renderTasks();
};

// Edit
window.editTask = async function (id) {
  const token = getToken();

  const newTitle = prompt("New Title:");
  if (!newTitle) return;

  const newDesc = prompt("New Description:");
  if (!newDesc) return;

  const newStatus = prompt("New Status (Pending / In Progress / Completed):");
  if (!newStatus) return;

  await updateTask(token, id, {
    title: newTitle.trim(),
    description: newDesc.trim(),
    status: newStatus.trim()
  });

  renderTasks();
};

// Logout button
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}
