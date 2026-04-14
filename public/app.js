// TAB SYSTEM
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(tab).classList.remove("hidden");
}

//This is now what is in the dashboard, also scary
function initDashboard() {
  const user = sessionStorage.getItem("user");

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcome").innerText = "Welcome " + user;

  prescriptions.load().then(() => {
    timer.start();
    loadAlerts();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const isDashboard = document.getElementById("welcome") !== null;
  if (isDashboard) initDashboard();
});

async function loadAlerts() {
  try {
    const res = await fetch("/api/alerts", {
      headers: { "x-username": sessionStorage.getItem("user") }
    });
    const alerts = await res.json();
    const alertsList = document.getElementById("alertsList");
    if (!alertsList) return;

    alertsList.innerHTML = "";

    if (alerts.length === 0) {
      alertsList.innerHTML = "<p>No alerts yet.</p>";
      return;
    }

    alerts.forEach(alert => {
      const time = new Date(alert.created_at).toLocaleString();
      const entry = document.createElement("div");
      entry.className = "error active";
      entry.innerHTML = `<strong>${time}</strong> - ${alert.message}`;
      alertsList.appendChild(entry);
    });
  } catch (err) {
    console.error("Load alerts error:", err);
  }
}