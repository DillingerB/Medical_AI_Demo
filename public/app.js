let providerItems = [];

// TAB SYSTEM
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(tab).classList.remove("hidden");
}

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
      const time = new Date(alert.created_at).toLocaleString([], {hour: '2-digit', minute: '2-digit'}) ;
      const entry = document.createElement("div");
      entry.className = "error active";
      entry.innerHTML = `<strong>${time}</strong> - ${alert.message}`;
      alertsList.appendChild(entry);
    });
  } catch (err) {
    console.error("Load alerts error:", err);
  }
}

async function linkProvider() {
  const providerUsername = document.getElementById("providerUsername")?.value.trim();
  const providerCode = document.getElementById("providerCode")?.value.trim();
  const linkError = document.getElementById("linkError");
  const linkSuccess = document.getElementById("linkSuccess");

  linkError.innerText = "";
  linkSuccess.innerText = "";
  linkError.classList.remove("active");
  linkSuccess.classList.remove("active");

  if (!providerUsername || !providerCode) {
    linkError.innerText = "Please enter both provider username and code."
    linkError.classList.add("active");
    return;
  }

  try {
    const res = await fetch("/api/link", {
      method: "POST",
      headers: { "Content-Type": "application/json",
         "x-username": sessionStorage.getItem("user"),
      },
      body: JSON.stringify({ providerUsername, providerCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      linkError.innerText = data.error || "Could not link provider.";
      linkError.classList.add("active");
      return;
    }

    linkSuccess.innerText = data.message;
    linkSuccess.classList.add("active");
  } catch (err) {
    console.error("Link provider error:", err);
  }
}



//This is now what is in the dashboard for the patient
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

function initProvider() {
  const user = sessionStorage.getItem("user");
  if (!user) {
    window.location.href = "index.html"
    return;
  }

  document.getElementById("welcome").innerText = "Welcome Dr. " + user;

  const code = sessionStorage.getItem("provider_code");
  const codeEl = document.getElementById("providerCodeDisplay");
  if (codeEl && code) codeEl.innerText = `Your Provider Code: ${code}`;

  loadPatients();
  loadAlerts();

  setInterval(() => {
    providerItems.forEach(p => {
      const span = document.getElementById(`t-${p.id}`);
      if (!span) return;

      if (!p.last_taken) {
        span.innerTest = "Not started";
        return;
      }

      const limit = p.value * 3600;
      const remaining = Math.max(0, limit - (Date.now() - new Date(p.last_taken).getTime()) / 1000);

      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = Math.floor(remaining % 60);

      span.innerText = `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    });
  }, 1000);
}

async function loadPatients() {
  try {
    const res = await fetch("/api/patients", {
      headers: {"x-username": sessionStorage.getItem("user") }
    });
    const patients = await res.json();
    const el = document.getElementById("patientList");
    if (!el) return;

    el.innerHTML = "";

    if (patients.length === 0) {
      el.innerHTML = "<p>No patients linked yet. Share your provider code with your patients.</p>";
      return;
    }

    patients.forEach(patient => {
      const prescriptions = patient.prescriptions.length > 0 ? patient.prescriptions.map(p => `
        <div class="card"
            data-last-taken="${p.last_taken || ''}"
            data-value = "${p.value}"
            data-span-id="${p.id}">
          <h3>${p.name} (${p.dosage}</h3>
          <p>Every ${p.value} ${p.type}</p>
          <p>Timer: <span id="t-${p.id}">${calcTimer(p.last_taken, p.value)}</span></p>
        </div>
        `).join("")
        : "<p>No prescriptions on file.</p>";

        el.innerHTML += `
        <div class="patient-card">
          <h2> ${patient.username}</h2>
          <div class="card-grid">${prescriptions}</div>
          <button onclick="showSendForm('${patient.username}')">Send Prescription</button>
          <button onclick="loadPatientAlerts('${patient.username}')">View Alerts</button>
          <div id="send-form-${patient.username}" class="hidden">
            <input type="text" id="send-name-${patient.username}" placeholder="Medication">
            <input type="text" id="send-dosage-${patient.username}" placeholder="Dosage">
            <select id="send-type-${patient.username}">
              <option value="">Select</option>
              <option value="hours">Hours</option>
              <option value="daily">Daily</option>
            </select>
            <input type="number" id="send-value-${patient.username}" placeholder="Value">
            <button onclick="sendPrescription('${patient.username}')">Send</button>
            <div class="error" id="send-error-${patient.username}"></div>
            <div class="hint" id="send-hint-${patient.username}"></div>
          </div>
          <div id="patient-alerts-${patient.username}"></div>
        </div>
        `;
    });

    providerItems = [];
    patients.forEach(patient => {
      patient.prescriptions.forEach(p => {
        providerItems.push({...p, patientUsername: patient.username});
      });
    });
  } catch (err) {
    console.error("Load patients error:", err);
  }
}

function showSendForm(patientUsername) {
  const form = document.getElementById(`send-form-${patientUsername}`);
  if (form) form.classList.toggle("hidden");
}

async function sendPrescription(patientUsername) {
  const name = document.getElementById(`send-name-${patientUsername}`).value.trim().toLowerCase();
  const dosage = document.getElementById(`send-dosage-${patientUsername}`).value.trim()
  const type = document.getElementById(`send-type-${patientUsername}`).value
  let value = document.getElementById(`send-value-${patientUsername}`).value

  const errorEl = document.getElementById(`send-error-${patientUsername}`);
  const successEl = document.getElementById(`send-hint-${patientUsername}`);

  errorEl.innerText = "";
  successEl.innerText = "";
  errorEl.classList.remove("active");
  successEl.classList.remove("active");

  if (type === "daily") {
    value = 24;
  } else {
    value = parseInt(value);
  }

  if (!name || !dosage || !type || (type === "hours" && !value)) {
    errorEl.innerText = "All fields are required.";
    errorEl.classList.add("active");
    return;
  }

  try {
    const res = await fetch("/api/prescriptions/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-username": sessionStorage.getItem("user"),
      },
      body: JSON.stringify({ patientUsername, name, dosage, type, value }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.innerText = data.error || "Failed to send prescription.";
      errorEl.classList.add("active");
      return;
    }

    successEl.innerText = `Prescription sent to ${patientUsername} successfully.`;
    successEl.classList.add("active");

    document.getElementById(`send-name-${patientUsername}`).value = "";
    document.getElementById(`send-dosage-${patientUsername}`).value = "";
    document.getElementById(`send-type-${patientUsername}`).value = "";
    document.getElementById(`send-value-${patientUsername}`).value = "";

    loadPatients();
  } catch (err) {
    console.error("Send prescription error:", err);
  }
}

async function loadPatientAlerts(patientUsername) {
  const el = document.getElementById(`patient-alerts-${patientUsername}`);
  if (!el) return;

  try {
    const res = await fetch(`/api/patients/${patientUsername}/alerts`, {
      headers: { "x-username": sessionStorage.getItem("user") }
    });
    const alerts = await res.json();

    el.innerHTML  = `<h4>Alerts for ${patientUsername}:</h4>`;

    if (alerts.length === 0) {
      el.innerHTML += "<p>No alerts.</p>";
      return;
    }

    alerts.forEach(alert => {
      const time = new Date(alert.created_at).toLocaleString();
      const entry = document.createElement("div");
      entry.className = "error active";
      entry.innerHTML = `<strong>${time}</strong> - ${alert.message}`;
      el.appendChild(entry);
    });
  } catch (err) {
    console.error("Load patient alerts error:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcome");
  const isProvider = document.getElementById("patientList") !== null;

  if (welcomeEl && isProvider) initProvider();
  else if (welcomeEl) initDashboard();
});

function calcTimer(lastTaken, value) {
  if(!lastTaken) return "Not started";

  const limit = value * 3600 *1000;
  const elapsed = Date.now() - new Date(lastTaken).getTime();
  const remaining = Math.max(0, limit - elapsed) / 1000;

  if (remaining === 0) return "Ready";

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}