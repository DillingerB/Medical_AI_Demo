const user = localStorage.getItem("user");
document.getElementById("welcome").innerText = "Welcome " + user;

let prescriptions = JSON.parse(localStorage.getItem("prescriptions") || "[]");

function showPasswordHelp() {
    document.getElementById("passwordHint").innerText = 
    "Password must be 8-20 characters";
}

function validateAuth(username, password) {
    let valid = true;

    document.getElementById("username").innerText = "";
    document.getElementById("password").innerText = "";

    if (!username) {
        document.getElementById("userError").innerText = "Must be filled in";
        valid = false;
    }

    if (!password) {
    document.getElementById("passError").innerText = "Must be filled in";
    valid = false;
  } else if (password.length < 8 || password.length > 20) {
    document.getElementById("passError").innerText =
      "Password must be 8–20 characters";
    valid = false;
  }

  return valid;
}

function signup() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!validateAuth(username, password)) return;

  // DEMO MODE (localStorage)
  const user = { username, password };
  localStorage.setItem("user", username);
  localStorage.setItem("auth", JSON.stringify(user));

  window.location.href = "dashboard.html";
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!validateAuth(username, password)) return;

  const stored = JSON.parse(localStorage.getItem("auth"));

  if (!stored || stored.username !== username || stored.password !== password) {
    document.getElementById("passError").innerText = "Invalid credentials";
    return;
  }

  localStorage.setItem("user", username);
  window.location.href = "dashboard.html";
}

// TAB SYSTEM
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
  document.getElementById(tab).classList.remove("hidden");
}

// ADD PRESCRIPTION
function addPrescription() {
  const name = document.getElementById("name").value;
  const dosage = document.getElementById("dosage").value;
  const type = document.getElementById("type").value;
  const value = parseInt(document.getElementById("value").value);

  // ❌ Test Case: Invalid input
  if (!name || !dosage || !type || !value) {
    alert("All fields required");
    return;
  }

  const med = {
    id: Date.now(),
    name,
    dosage,
    type,
    value,
    lastTaken: null
  };

  prescriptions.push(med);
  save();
  render();
}

// TAKE PILL
function takePill(id) {
  const med = prescriptions.find(m => m.id === id);

  if (med.lastTaken) {
    const diff = (Date.now() - med.lastTaken) / 1000;
    const limit = med.type === "hours"
      ? med.value * 3600
      : med.value * 86400;

    // ❌ Test Case: Too early
    if (diff < limit) {
      alert("Taking anymore pills can be harmful, please wait.");
      return;
    }
  }

  med.lastTaken = Date.now();
  save();
}

// SAVE
function save() {
  localStorage.setItem("prescriptions", JSON.stringify(prescriptions));
}

// RENDER
function render() {
  const list = document.getElementById("list");
  const home = document.getElementById("homeList");

  list.innerHTML = "";
  home.innerHTML = "";

  prescriptions.forEach(m => {
    list.innerHTML += card(m, true);
    home.innerHTML += card(m, false);
  });
}

// CARD TEMPLATE
function card(m, showButtons) {
  return `
    <div class="card">
      <h3>${m.name} (${m.dosage})</h3>
      <p>Every ${m.value} ${m.type}</p>

      ${showButtons ? `
        <button onclick="takePill(${m.id})">Take Pill</button>
        <button>Refill</button>
      ` : ""}

      <p>Timer: <span id="t-${m.id}">Not started</span></p>
    </div>
  `;
}

// TIMER LOOP
setInterval(() => {
  let closest = Infinity;

  prescriptions.forEach(m => {
    const el = document.getElementById("t-" + m.id);
    if (!el) return;

    if (!m.lastTaken) {
      el.innerText = "Not started";
      return;
    }

    const limit = m.type === "hours"
      ? m.value * 3600
      : m.value * 86400;

    const remaining = Math.max(0, limit - (Date.now() - m.lastTaken)/1000);

    const h = Math.floor(remaining/3600);
    const m2 = Math.floor((remaining%3600)/60);
    const s = Math.floor(remaining%60);

    el.innerText = `${h}h ${m2}m ${s}s`;

    if (remaining < closest) closest = remaining;
  });

  document.getElementById("closestTimer").innerText =
    closest === Infinity ? "None" : Math.floor(closest) + " sec";

}, 1000);

// INIT
render();