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

  prescriptions.load().then(() => timer.start());
}

document.addEventListener("DOMContentLoaded", () => {
  const isDashboard = document.getElementById("welcome") !== null;
  if (isDashboard) initDashboard();
});