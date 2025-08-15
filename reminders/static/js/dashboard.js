/***********************
 * Office Zenith – dashboard.js (cleaned)
 ***********************/

// ---- Settings ----
const DEV_MODE = false;                  // true => every reminder fires every 30s
const TEST_INTERVAL_MS = 30_000;         // 30s for dev testing

// ---- Data ----
let reminders = [
  {
    id: 1,
    title: "Hydration Break 💧",
    description: "Time to drink a glass of water to stay hydrated and maintain focus.",
    timer: 30,            // stored in minutes if unit is minutes/hours; if seconds, timer = seconds/60
    timerUnit: "minutes", // "seconds" | "minutes" | "hours"
    originalValue: 30,    // value in the chosen unit (what you show)
    isActive: false
  },
  {
    id: 2,
    title: "Eye Rest 20-20-20 Rule👀",
    description: "Look at something 20 feet away for 20 seconds to reduce eye strain.",
    timer: 20,
    timerUnit: "minutes",
    originalValue: 20,
    isActive: false
  },
  {
    id: 3,
    title: "Posture Check 🧘",
    description: "Adjust your sitting posture, straighten your back, and relax your shoulders.",
    timer: 45,
    timerUnit: "minutes",
    originalValue: 45,
    isActive: false
  },
  {
    id: 4,
    title: "Movement Break 🚶",
    description: "Stand up, stretch, or take a short walk to improve circulation.",
    timer: 60,
    timerUnit: "minutes",
    originalValue: 60,
    isActive: false
  }
];

let logs = [];
let activeTimers = {};

// ---- Init ----
window.addEventListener("load", () => {
  loadTheme();
  checkNotificationPermission();
  loadReminders();
  loadLogs();
});

// ---- Theme ----
function loadTheme() {
  const isDark = localStorage.getItem("darkTheme") === "true";
  if (isDark) {
    document.body.classList.add("dark");
    const icon = document.getElementById("themeIcon");
    const text = document.getElementById("themeText");
    if (icon) icon.textContent = "☀️";
    if (text) text.textContent = "Light";
  }
}

function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  body.classList.toggle("dark");
  const isDark = body.classList.contains("dark");

  if (isDark) {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light";
    localStorage.setItem("darkTheme", "true");
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark";
    localStorage.setItem("darkTheme", "false");
  }
}

// ---- Reminders UI ----
function loadReminders() {
  const grid = document.getElementById("remindersGrid");
  grid.innerHTML = "";

  if (!reminders.length) {
    grid.innerHTML = '<div class="empty-state">No reminders yet. Add your first wellness reminder!</div>';
    return;
  }

  reminders.forEach((reminder) => {
    const card = createReminderCard(reminder);
    grid.appendChild(card);
    if (reminder.isActive) {
      startTimer(reminder.id);
    }
  });
}

function createReminderCard(reminder) {
  const card = document.createElement("div");
  card.className = `reminder-card ${reminder.isActive ? "active" : "inactive"}`;
  card.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${escapeHtml(reminder.title)}</h3>
      <span class="status-badge ${reminder.isActive ? "status-active" : "status-inactive"}">
        ${reminder.isActive ? "Active" : "Inactive"}
      </span>
    </div>
    <p class="card-description">${escapeHtml(reminder.description)}</p>
    <div class="timer-info">
      <span>Every ${reminder.originalValue || reminder.timer} ${reminder.timerUnit || "minutes"}</span>
      <button class="btn-edit" onclick="editTimer(${reminder.id})">✏️</button>
    </div>
    <div class="card-actions">
      <button class="btn ${reminder.isActive ? "btn-danger" : "btn-success"}" onclick="toggleReminder(${reminder.id})">
        ${reminder.isActive ? "Stop" : "Start"}
      </button>
      <button class="btn" onclick="logActivity(${reminder.id})">Log Now</button>
      <button class="btn btn-secondary" onclick="deleteReminder(${reminder.id})">Delete</button>
    </div>
  `;
  return card;
}

function toggleReminder(id) {
  const reminder = reminders.find((r) => r.id === id);
  if (!reminder) return;

  reminder.isActive = !reminder.isActive;

  if (reminder.isActive) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      showToast("Please enable notifications first!");
      reminder.isActive = false;
      loadReminders();
      return;
    }
    startTimer(id);
    showToast(`${reminder.title} started!`);
  } else {
    stopTimer(id);
    showToast(`${reminder.title} stopped!`);
  }

  loadReminders();
}

function startTimer(reminderId) {
  stopTimer(reminderId); // clear existing

  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) return;

  // Compute real interval
  const unit = reminder.timerUnit || "minutes";
  const valueShown = reminder.originalValue ?? reminder.timer;

  let intervalMs;
  if (DEV_MODE) {
    intervalMs = TEST_INTERVAL_MS; // dev/testing shortcut
  } else {
    switch (unit) {
      case "seconds":
        intervalMs = valueShown * 1000;
        break;
      case "hours":
        intervalMs = valueShown * 60 * 60 * 1000;
        break;
      case "minutes":
      default:
        intervalMs = valueShown * 60 * 1000;
        break;
    }
  }

  // Safety cap to avoid 0 or NaN
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) intervalMs = 60_000;

  activeTimers[reminderId] = setInterval(() => {
    const r = reminders.find((x) => x.id === reminderId);
    if (r && r.isActive) {
      showNotification(r.title, r.description);
      logActivity(reminderId, true);
    }
  }, intervalMs);
}

function stopTimer(reminderId) {
  if (activeTimers[reminderId]) {
    clearInterval(activeTimers[reminderId]);
    delete activeTimers[reminderId];
  }
}

// ---- Notifications ----
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Browser does not support notifications");
    return;
  }

  Notification.requestPermission()
    .then((permission) => {
      checkNotificationPermission();
      if (permission === "granted") {
        showToast("Notifications enabled!");
        setTimeout(testNotification, 600);
      } else if (permission === "denied") {
        showToast("Notifications permission denied");
      } else {
        showToast("Notifications permission dismissed");
      }
    })
    .catch(() => showToast("Error requesting notification permission"));
}

function checkNotificationPermission() {
  const statusElement = document.getElementById("notificationState");
  const testBtn = document.getElementById("testBtn");
  const demoDiv = document.getElementById("notificationDemo");

  if (!("Notification" in window)) {
    statusElement.textContent = "Not Supported";
    statusElement.style.color = "#ef4444";
    testBtn.style.display = "none";
    return;
  }

  switch (Notification.permission) {
    case "granted":
      statusElement.textContent = "Enabled";
      statusElement.style.color = "#10b981";
      testBtn.style.display = "inline-flex";
      if (demoDiv) demoDiv.style.display = "block";
      break;
    case "denied":
      statusElement.textContent = "Denied";
      statusElement.style.color = "#ef4444";
      testBtn.style.display = "none";
      break;
    default:
      statusElement.textContent = "Click Enable";
      statusElement.style.color = "#f59e0b";
      testBtn.style.display = "none";
      if (demoDiv) demoDiv.style.display = "block";
  }
}

function showNotification(title, description) {
  if (!("Notification" in window)) {
    showToast("Browser does not support notifications");
    return;
  }

  if (Notification.permission !== "granted") {
    showToast("Notifications not permitted");
    return;
  }

  try {
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      // Vibrate if available + toast fallback (service workers are typically needed for persistent mobile notifs)
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      showToast(`🔔 ${title}: ${description}`);
      return;
    }

    const notification = new Notification(`Office Zenith: ${title}`, {
      body: description,
      icon:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn6eYPC90ZXh0Pjwvc3ZnPg==",
      requireInteraction: false,
      silent: false
    });

    notification.onclick = function () {
      window.focus();
      this.close();
    };

    setTimeout(() => notification.close(), 5000);
  } catch {
    showToast(`🔔 ${title}: ${description}`);
  }
}

function testNotification() {
  if (!("Notification" in window)) {
    showToast("Your browser does not support notifications");
    return;
  }
  if (Notification.permission !== "granted") {
    showToast("Please enable notifications first");
    return;
  }

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    showToast("🔔 Test Notification: If you can see this, it works!");
    return;
  }

  const n = new Notification("Office Zenith Test", {
    body: "If you can see this, notifications are working perfectly!",
    icon:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn6eYPC90ZXh0Pjwvc3ZnPg==",
    tag: "test-notification",
    requireInteraction: false
  });
  setTimeout(() => n.close(), 5000);
  showToast("Test notification sent!");
}

// ---- Logs ----
function logActivity(reminderId, automated = false) {
  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) return;

  const log = {
    id: Date.now(),
    reminderId,
    reminderTitle: reminder.title,
    timestamp: new Date(),
    automated
  };

  logs.unshift(log);
  loadLogs();

  if (!automated) showToast(`Activity logged: ${reminder.title}`);
}

function loadLogs() {
  const logsList = document.getElementById("logsList");

  if (!logs.length) {
    logsList.innerHTML = '<div class="empty-state">No activities logged yet.</div>';
    return;
  }

  logsList.innerHTML = logs
    .slice(0, 20)
    .map(
      (log) => `
      <div class="log-item">
        <div class="log-title">${escapeHtml(log.reminderTitle)}</div>
        <div class="log-time">${new Date(log.timestamp).toLocaleString()} ${
        log.automated ? "(Auto)" : "(Manual)"
      }</div>
      </div>`
    )
    .join("");
}

function clearLogs() {
  if (confirm("Are you sure you want to clear all logs?")) {
    logs = [];
    loadLogs();
    showToast("Logs cleared");
  }
}

function downloadTodayLogs() {
  const today = new Date();
  const todayStr = today.toDateString();

  const todayLogs = logs.filter(
    (log) => new Date(log.timestamp).toDateString() === todayStr
  );

  if (!todayLogs.length) {
    showToast("No activities logged today");
    return;
  }

  let content = `
Office Zenith - Daily Wellness Report
Date: ${todayStr}
Generated: ${today.toLocaleString()}

===========================================

ACTIVITY SUMMARY
===========================================

Total Activities: ${todayLogs.length}
Manual Logs: ${todayLogs.filter((l) => !l.automated).length}
Automatic Logs: ${todayLogs.filter((l) => l.automated).length}

===========================================

DETAILED LOG
===========================================

`;

  todayLogs.forEach((log, idx) => {
    content += `${idx + 1}. ${log.reminderTitle}
   Time: ${new Date(log.timestamp).toLocaleString()}
   Type: ${log.automated ? "Automatic" : "Manual"}

`;
  });

  content += `
===========================================

REMINDER BREAKDOWN
===========================================

`;

  const stats = {};
  todayLogs.forEach((l) => {
    stats[l.reminderTitle] = (stats[l.reminderTitle] || 0) + 1;
  });

  Object.entries(stats).forEach(([title, count]) => {
    content += `${title}: ${count} times\n`;
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `office-zenith-logs-${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${todayLogs.length} activities for today`);
}

// ---- CRUD ----
function addReminder(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const timerValue = parseInt(formData.get("timerValue"), 10);
  const timerUnit = formData.get("timerUnit");

  if (!Number.isFinite(timerValue) || timerValue <= 0) {
    showToast("Please enter a valid timer value");
    return;
  }

  // Store a minutes-normalized number in "timer" (for compatibility); also keep original + unit
  const timerInMinutes =
    timerUnit === "seconds"
      ? timerValue / 60
      : timerUnit === "hours"
      ? timerValue * 60
      : timerValue;

  const newReminder = {
    id: Date.now(),
    title: formData.get("title").toString(),
    description: formData.get("description").toString(),
    timer: timerInMinutes,
    timerUnit,
    originalValue: timerValue,
    isActive: false
  };

  reminders.push(newReminder);
  loadReminders();

  event.target.reset();
  toggleAddForm();

  showToast("Reminder added successfully");
}

function editTimer(id) {
  const reminder = reminders.find((r) => r.id === id);
  if (!reminder) return;

  const currentUnit = reminder.timerUnit || "minutes";
  const currentValue = reminder.originalValue || reminder.timer;

  const newValueStr = prompt(
    `Enter new timer value (current: ${currentValue} ${currentUnit}):`,
    currentValue
  );
  if (newValueStr === null || newValueStr === "") return;

  const numValue = parseInt(newValueStr, 10);
  if (!Number.isFinite(numValue) || numValue <= 0) {
    showToast("Please enter a valid number");
    return;
  }

  // Choose unit
  const wantMinutes = confirm("Click OK for minutes, Cancel for seconds.\n(Use Hours later from the Add form.)");
  const newUnit = wantMinutes ? "minutes" : "seconds";

  const timerInMinutes =
    newUnit === "seconds" ? numValue / 60 : numValue; // minutes

  const wasActive = reminder.isActive;
  if (wasActive) stopTimer(id);

  reminder.timer = timerInMinutes;
  reminder.timerUnit = newUnit;
  reminder.originalValue = numValue;

  if (wasActive) startTimer(id);

  loadReminders();
  showToast(`Timer updated to ${numValue} ${newUnit}`);
}

function deleteReminder(id) {
  if (!confirm("Delete this reminder?")) return;

  stopTimer(id);
  reminders = reminders.filter((r) => r.id !== id);
  logs = logs.filter((log) => log.reminderId !== id);
  loadReminders();
  loadLogs();
  showToast("Reminder deleted");
}

function toggleAddForm() {
  const form = document.getElementById("addReminderForm");
  form.classList.toggle("show");
}

// ---- Toast ----
function showToast(message) {
  const toast = document.getElementById("toast");
  const messageElement = document.getElementById("toastMessage");

  messageElement.textContent = message;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ---- Utils ----
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
