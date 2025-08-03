// Default reminders data
let reminders = [
  {
    id: 1,
    title: "Hydration Break 💧",
    description:
      "Time to drink a glass of water to stay hydrated and maintain focus.",
    timer: 30,
    isActive: false,
  },
  {
    id: 2,
    title: "Eye Rest 20-20-20 Rule👀",
    description:
      "Look at something 20 feet away for 20 seconds to reduce eye strain.",
    timer: 20,
    isActive: false,
  },
  {
    id: 3,
    title: "Posture Check 🧘",
    description:
      "Adjust your sitting posture, straighten your back, and relax your shoulders.",
    timer: 45,
    isActive: false,
  },
  {
    id: 4,
    title: "Movement Break 🚶",
    description:
      "Stand up, stretch, or take a short walk to improve circulation.",
    timer: 60,
    isActive: false,
  },
];

let logs = [];
let activeTimers = {};

// Initialize the app
window.onload = function () {
  loadReminders();
  loadLogs();
  checkNotificationPermission();
  loadTheme();
};

function loadTheme() {
  const isDark = localStorage.getItem("darkTheme") === "true";
  if (isDark) {
    document.body.classList.add("dark");
    document.getElementById("themeIcon").textContent = "☀️";
    document.getElementById("themeText").textContent = "Light";
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

function downloadTodayLogs() {
  const today = new Date();
  const todayStr = today.toDateString();

  // Filter logs for today
  const todayLogs = logs.filter(
    (log) => log.timestamp.toDateString() === todayStr
  );

  if (todayLogs.length === 0) {
    showToast("No activities logged today");
    return;
  }

  // Create PDF content
  let pdfContent = `
Office Zenith - Daily Wellness Report
Date: ${todayStr}
Generated: ${today.toLocaleString()}

===========================================

ACTIVITY SUMMARY
===========================================

Total Activities: ${todayLogs.length}
Manual Logs: ${todayLogs.filter((log) => !log.automated).length}
Automatic Logs: ${todayLogs.filter((log) => log.automated).length}

===========================================

DETAILED LOG
===========================================

`;

  // Add each log entry
  todayLogs.forEach((log, index) => {
    pdfContent += `${index + 1}. ${log.reminderTitle}
   Time: ${log.timestamp.toLocaleString()}
   Type: ${log.automated ? "Automatic" : "Manual"}
   
`;
  });

  pdfContent += `
===========================================

REMINDER BREAKDOWN
===========================================

`;

  // Group by reminder type
  const reminderStats = {};
  todayLogs.forEach((log) => {
    if (!reminderStats[log.reminderTitle]) {
      reminderStats[log.reminderTitle] = 0;
    }
    reminderStats[log.reminderTitle]++;
  });

  Object.entries(reminderStats).forEach(([title, count]) => {
    pdfContent += `${title}: ${count} times\n`;
  });

  // Create and download the file
  const blob = new Blob([pdfContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `office-zenith-logs-${today.getFullYear()}-${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  showToast(`Downloaded ${todayLogs.length} activities for today`);
}

function loadReminders() {
  const grid = document.getElementById("remindersGrid");
  grid.innerHTML = "";

  if (reminders.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">No reminders yet. Add your first wellness reminder!</div>';
    return;
  }

  reminders.forEach((reminder) => {
    const card = createReminderCard(reminder);
    grid.appendChild(card);

    if (reminder.isActive) {
      startTimer(reminder.id, reminder.timer);
    }
  });
}

function createReminderCard(reminder) {
  const card = document.createElement("div");
  card.className = `reminder-card ${reminder.isActive ? "active" : "inactive"}`;
  card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">${reminder.title}</h3>
                    <span class="status-badge ${
                      reminder.isActive ? "status-active" : "status-inactive"
                    }">
                        ${reminder.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
                <p class="card-description">${reminder.description}</p>
                <div class="timer-info">
                    <span>Every ${reminder.originalValue || reminder.timer} ${
    reminder.timerUnit || "minutes"
  }</span>
                    <button class="btn-edit" onclick="editTimer(${
                      reminder.id
                    })">✏️</button>
                </div>
                <div class="card-actions">
                    <button class="btn ${
                      reminder.isActive ? "btn-danger" : "btn-success"
                    }" 
                            onclick="toggleReminder(${reminder.id})">
                        ${reminder.isActive ? "Stop" : "Start"}
                    </button>
                    <button class="btn" onclick="logActivity(${reminder.id})">
                        Log Now
                    </button>
                    <button class="btn btn-secondary" onclick="deleteReminder(${
                      reminder.id
                    })">
                        Delete
                    </button>
                </div>
            `;
  return card;
}

function toggleReminder(id) {
  const reminder = reminders.find((r) => r.id === id);
  if (reminder) {
    reminder.isActive = !reminder.isActive;

    if (reminder.isActive) {
      if (Notification.permission !== "granted") {
        showToast("Please enable notifications first!");
        reminder.isActive = false;
        return;
      }
      startTimer(id, reminder.timer);
      showToast(`${reminder.title} started!`);
    } else {
      stopTimer(id);
      showToast(`${reminder.title} stopped!`);
    }

    loadReminders();
  }
}

function startTimer(reminderId, minutes) {
  stopTimer(reminderId); // Clear any existing timer

  console.log(`Starting timer for reminder ${reminderId} - ${minutes} minutes`);

  // For demo purposes, use shorter intervals (30 seconds instead of full minutes)
  // Remove this line and uncomment the one below for production
  const intervalMs = 30000; // 30 seconds for testing
  // const intervalMs = minutes * 60 * 1000; // Actual minutes for production

  activeTimers[reminderId] = setInterval(() => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (reminder && reminder.isActive) {
      console.log(`Timer triggered for: ${reminder.title}`);
      showNotification(reminder.title, reminder.description);
      logActivity(reminderId, true);
    }
  }, intervalMs);
}

function stopTimer(reminderId) {
  if (activeTimers[reminderId]) {
    clearInterval(activeTimers[reminderId]);
    delete activeTimers[reminderId];
    console.log(`Timer stopped for reminder ${reminderId}`);
  }
}

function showNotification(title, description) {
  console.log("Attempting to show notification:", title);

  if (!("Notification" in window)) {
    console.log("Browser does not support notifications");
    showToast("Browser does not support notifications");
    return;
  }

  if (Notification.permission === "granted") {
    try {
      // Check if we're on mobile/service worker required
      if (
        "serviceWorker" in navigator &&
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      ) {
        // For mobile devices, use a fallback approach
        showToast(`🔔 ${title}: ${description}`);
        console.log("Mobile notification shown as toast");
      } else {
        // Desktop notification
        const notification = new Notification(`Office Zenith: ${title}`, {
          body: description,
          icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn6eYPC90ZXh0Pjwvc3ZnPg==",
          requireInteraction: false,
          silent: false,
        });

        console.log("Desktop notification created successfully");

        notification.onclick = function () {
          console.log("Notification clicked");
          window.focus();
          this.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      // Fallback to toast notification
      showToast(`🔔 ${title}: ${description}`);
    }
  } else {
    console.log(
      "Notification permission not granted:",
      Notification.permission
    );
    showToast("Notifications not permitted");
  }
}

function testNotification() {
  console.log("Testing notification...");

  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    showToast("Your browser does not support notifications");
    return;
  }

  if (Notification.permission !== "granted") {
    console.log("Permission not granted");
    showToast("Please enable notifications first");
    return;
  }

  try {
    // Check if we're on mobile
    if (
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      // Mobile fallback - show enhanced toast
      showToast(
        "🔔 Test Notification: If you can see this, notifications are working!"
      );
      console.log("Mobile test notification shown as enhanced toast");
    } else {
      // Desktop notification
      const notification = new Notification("Office Zenith Test", {
        body: "If you can see this, notifications are working perfectly!",
        icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn6eYPC90ZXh0Pjwvc3ZnPg==",
        tag: "test-notification",
        requireInteraction: false,
      });

      console.log("Desktop test notification created");
      showToast("Test notification sent!");

      // Handle click
      notification.onclick = function () {
        console.log("Test notification clicked");
        window.focus();
        this.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  } catch (error) {
    console.error("Error creating test notification:", error);
    // Always fallback to toast on error
    showToast("🔔 Test Notification: Fallback mode active!");
  }
}

function logActivity(reminderId, automated = false) {
  const reminder = reminders.find((r) => r.id === reminderId);
  if (reminder) {
    const log = {
      id: Date.now(),
      reminderId: reminderId,
      reminderTitle: reminder.title,
      timestamp: new Date(),
      automated: automated,
    };

    logs.unshift(log);
    loadLogs();

    if (!automated) {
      showToast(`Activity logged: ${reminder.title}`);
    }
  }
}

function loadLogs() {
  const logsList = document.getElementById("logsList");

  if (logs.length === 0) {
    logsList.innerHTML =
      '<div class="empty-state">No activities logged yet.</div>';
    return;
  }

  logsList.innerHTML = logs
    .slice(0, 20)
    .map(
      (log) => `
                <div class="log-item">
                    <div class="log-title">${log.reminderTitle}</div>
                    <div class="log-time">${log.timestamp.toLocaleString()} ${
        log.automated ? "(Auto)" : "(Manual)"
      }</div>
                </div>
            `
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

function addReminder(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const timerValue = parseInt(formData.get("timerValue"));
  const timerUnit = formData.get("timerUnit");

  // Convert to minutes for storage
  const timerInMinutes = timerUnit === "seconds" ? timerValue / 60 : timerValue;

  const newReminder = {
    id: Date.now(),
    title: formData.get("title"),
    description: formData.get("description"),
    timer: timerInMinutes,
    timerUnit: timerUnit,
    originalValue: timerValue,
    isActive: false,
  };

  reminders.push(newReminder);
  loadReminders();

  // Reset form and hide it
  event.target.reset();
  toggleAddForm();

  showToast("Reminder added successfully");
}

function editTimer(id) {
  const reminder = reminders.find((r) => r.id === id);
  if (!reminder) return;

  const currentUnit = reminder.timerUnit || "minutes";
  const currentValue = reminder.originalValue || reminder.timer;

  const newValue = prompt(
    `Enter new timer value (current: ${currentValue} ${currentUnit}):`,
    currentValue
  );
  if (newValue === null || newValue === "") return;

  const numValue = parseInt(newValue);
  if (isNaN(numValue) || numValue <= 0) {
    showToast("Please enter a valid number");
    return;
  }

  const newUnit = confirm("Click OK for minutes, Cancel for seconds")
    ? "minutes"
    : "seconds";
  const timerInMinutes = newUnit === "seconds" ? numValue / 60 : numValue;

  // Stop current timer if running
  if (reminder.isActive) {
    stopTimer(id);
  }

  // Update reminder
  reminder.timer = timerInMinutes;
  reminder.timerUnit = newUnit;
  reminder.originalValue = numValue;

  // Restart timer if it was active
  if (reminder.isActive) {
    startTimer(id, timerInMinutes);
  }

  loadReminders();
  showToast(`Timer updated to ${numValue} ${newUnit}`);
}

function deleteReminder(id) {
  if (confirm("Delete this reminder?")) {
    stopTimer(id);
    reminders = reminders.filter((r) => r.id !== id);
    logs = logs.filter((log) => log.reminderId !== id);
    loadReminders();
    loadLogs();
    showToast("Reminder deleted");
  }
}

function toggleAddForm() {
  const form = document.getElementById("addReminderForm");
  form.classList.toggle("show");
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Browser does not support notifications");
    return;
  }

  console.log("Requesting notification permission...");

  Notification.requestPermission()
    .then(function (permission) {
      console.log("Permission result:", permission);
      checkNotificationPermission();

      if (permission === "granted") {
        showToast("Notifications enabled!");
        // Show test notification immediately
        setTimeout(() => {
          testNotification();
        }, 1000);
      } else {
        showToast("Notifications permission denied");
      }
    })
    .catch(function (error) {
      console.error("Error requesting permission:", error);
      showToast("Error requesting notification permission");
    });
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

  console.log("Current notification permission:", Notification.permission);

  switch (Notification.permission) {
    case "granted":
      statusElement.textContent = "Enabled";
      statusElement.style.color = "#10b981";
      testBtn.style.display = "inline-flex";
      demoDiv.style.display = "block";
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
      demoDiv.style.display = "block";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const messageElement = document.getElementById("toastMessage");

  messageElement.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
