const user = localStorage.getItem("user");
document.getElementById("welcome").innerText = "Welcome " + user;

let prescriptions = JSON.parse(localStorage.getItem("prescriptions") || "[]");

function showPasswordHelp() {
    const hint = document.getElementById("passwordHint");
    hint.innerText = "Password must be 8-20 characters";
    hint.classList.add("active");
}

function hidePasswordHelp() {
  document.getElementById("passwordHint").classList.remove("active");
}

function validateAuth(username, password) {
    let valid = true;

    const userError = document.getElementById("userError");
    const passError = document.getElementById("passError");

    userError.innerText = "";
    passError.innerText = "";

    userError.classList.remove("active");
    passError.classList.remove("active");

      if (!username) {
        userError.innerText = "Username must be filled in.";
        userError.classList.add("active");
        valid = false;
      }

      if (!password) {
        passError.innerText = "Password must be filled in.";
        passError.classList.add("active");
        valid = false;
      } else if (password.length < 8 || password.length >20) {
        passError.innerText = "Password must be 8-20 characters";
        passError.classList.add("active");
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
  let value = document.getElementById("value").value;

  if (type === "daily") {
    value = 1;
  } else {
    value = parseInt(value);
  }

  //Test Case: Invalid input
  if (!name || !dosage || !type || (type === "hours" && !value)) {
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

    // Test Case: Too early
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
        <button onclick="deletePrescription(${m.id})">Delete</button>
      ` : ""}

      <p>Timer: <span id="t-${m.id}">Not started</span></p>
    </div>
  `;
}

function deletePrescription(id) {
  // Find prescription by id
  const med = prescriptions.find(m => m.id === id);
  if (!med) return;

  // Ask for confirmation
  const confirmed = confirm(`Are you sure you want to delete "${med.name}"?`);
  if (!confirmed) return;

  // Remove from prescriptions array
  prescriptions = prescriptions.filter(m => m.id !== id);

  // Save updated list to localStorage
  localStorage.setItem("prescriptions", JSON.stringify(prescriptions));

  // Remove card element from DOM
  const cardEl = document.getElementById(`card-${id}`);
  if (cardEl) cardEl.remove();

  // Re-render timers and home list
  render();
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

    el.innerText = `${h}:${m2}:${s}`;

    if (remaining < closest) closest = remaining;
    if (remaining === 0 ) return;
  });

  if (closest === Infinity) {
    document.getElementById("closestTimer").innerText = "None"
  } else {
    const h = Math.floor(closest / 3600);
    const m = Math.floor((closest % 3600) / 60);
    const s = Math.floor(closest % 60);

    document.getElementById("closestTimer").innerText = `${h}:${m}:${s}`;
  }

}, 1000);

// INIT
render();