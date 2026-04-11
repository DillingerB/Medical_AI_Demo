class PrescriptionManager {
    constructor() {
        this.items = [];
    }

    //Fetch all prescriptions for the current user
    async load() {
        try {
            const res = await fetch("/api/prescriptions", {
                headers: { "x-username": sessionStorage.getItem("user") }
            });

            this.items = await res.json();
            this.render();
        } catch (err) {
            console.error("Failed to load prescriptions:", err);
        }
    }

    //add prescriptions for user
    async add() {
        const name = document.getElementById("name").value.trim();
        const dosage = document.getElementById("dosage").value.trim();
        const type = document.getElementById("type").value;
        let value = document.getElementById("value").value;

        if (type === "daily") {
            value = 24;
        } else {
            value = parseInt(value);
        }

        if (!name || !dosage || !type || (type === "hours" && !value)) {
            alert("All fiields are required.");
            return;
        }

        try {
            const res = await fetch("/api/prescriptions", {
                method: "POST",
                headers: {"Content-Type": "application/json", 
                    "x-username": sessionStorage.getItem("user"),
                 },
                body: JSON.stringify({ name, dosage, type, value }),
            });

            if (!res.ok) throw new Error("Failed to add prescription");

            const med = await res.json();
            this.items.push(med);
            this.render();

            document.getElementById("name").value = "";
            document.getElementById("dosage").value = "";
            document.getElementById("type").value = "";
            document.getElementById("value").value = "";
        } catch (err) {
            console.error("Add prescription error:", err);
            alert("Could not save prescription. Please try again.");
        }
    }

    //Record dose taken
    async takePill(id) {
        const med = this.items.find(m => m.id == id);
        if (!med) return;

        if (med.last_taken) {
            const diffSeconds = (Date.now() - new Date(med.last_taken).getTime()) / 1000;
            const limitSeconds = med.value * 3600;

            if (diffSeconds < limitSeconds) {
                alert("Taking more pills now could be harmful. Please wait until the timer reaches zero.");
                return;
            }
        }
        
        try {
            const res = await fetch (`/api/prescriptions/${id}/take`, {
                 method: "POST",
                 headers: {"x-username": sessionStorage.getItem("user") },
                });

            if (!res.ok) throw new Error("Failed to record dose");

            med.last_taken = new Date().toISOString();
        } catch (err) {
            console.error("Take pill error:", err);
        }
    }

    //Delete a prescription
    async delete(id) {
        const med = this.items.find(m => m.id == id);
        if (!med) return;

        const confirmed = confirm(`Delete "${med.name}"?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/prescriptions/${id}`, {
                method: "DELETE",
                headers: { "x-username": sessionStorage.getItem("user") },
            });

            if (!res.ok) throw new Error("Failed to delete prescription");

            this.items = this.items.filter(m => m.id !== id);
            this.render();
        } catch (err) {
            console.error("Delete error:", err);
        }
    }

    render() {
        const list = document.getElementById("list");
        const home = document.getElementById("homeList");
        if (!list || !home) return;

        list.innerHTML = "";
        home.innerHTML = "";

        this.items.forEach(med => {
            list.innerHTML += this.card(med, true);
            home.innerHTML += this.card(med, false);
        });
    }

    //prescription card template
    card(m, showButtons) {
    return `
      <div class="card" id="card-${m.id}">
        <h3>${m.name} (${m.dosage})</h3>
        <p>Every ${m.value} ${m.type}</p>
 
        ${showButtons ? `
          <button onclick="prescriptions.takePill(${m.id})">Take Pill</button>
          <button>Refill</button>
          <button onclick="prescriptions.deletePrescription(${m.id})">Delete</button>
        ` : ""}
 
        <p>Timer: <span id="t-${m.id}">Not started</span></p>
      </div>
    `;
  }
}

const prescriptions = new PrescriptionManager();