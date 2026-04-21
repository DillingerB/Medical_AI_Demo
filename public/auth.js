class Auth {

    //shows password help
    showPasswordHelp() {
        const hint = document.getElementById("passwordHint");
        hint.innerText = "Password must be 8-20 characters";
        hint.classList.add("active");
    }

    //hides password help
    hidePasswordHelp() {
        document.getElementById("passwordHint").classList.remove("active");
    }

    //validation for test cases
    validateAuth(username, password, checkRole= false) {
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
        } else if (username.length > 50) {
            userError.innerText = "Username too long.";
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
        if (checkRole) {
            const patient = document.getElementById("patient")?.checked;
            const provider = document.getElementById("medical-providor")?.checked;
            const roleErorr = document.getElementById("roleError");

            roleErorr.innerText = "";
            roleErorr.classList.remove("active");

            if (!patient && !provider) {
                roleErorr.innerText = "Please select either Patient or Medical Provider.";
                roleErorr.classList.add("active");
                valid = false;
            }
        }
        return valid;
    }

    //credentials (username, password)
    getCredentials() {
        return {
            username: document.getElementById("username").value.trim(),
            password: document.getElementById("password").value.trim(),
        };
    }

    //signup section
    async signup() {
        const { username, password } = this.getCredentials();
        if (!this.validateAuth(username, password, true)) return;

        const patient  = document.getElementById("patient").checked;
        const provider = document.getElementById("medical-providor").checked;
        const role = provider ? "provider" : "patient";

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                document.getElementById("userError").innerText = data.error || "Signup failed.";
                document.getElementById("userError").classList.add("active");
                return;
            }

            if (data.provider_code) {
                alert(`Your provider code is: ${data.provider_code}\nShare this with your patients so they can link to you.`);
            }

            sessionStorage.setItem("user", username);
            sessionStorage.setItem("role", data.role);
            if (data.provider_code) {
                sessionStorage.setItem("provider_code", data.provider_code);
            }
            window.location.href = data.role === "provider" ? "provider.html" : "dashboard.html";
        } catch (err) {
            console.error("Signup error:", err);
            alert("Could not connect to server. Please try again.");
        }
    }

    //login
    async login() {
        const { username, password } = this.getCredentials();
        if (!this.validateAuth(username, password)) return;

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                document.getElementById("passError").innerText = data.error || "Invalid credentials.";
                document.getElementById("passError").classList.add("active");
                return;
            }
            sessionStorage.setItem("user", username);
            sessionStorage.setItem("role", data.role);
            if (data.provider_code) {
                sessionStorage.setItem("provider_code", data.provider_code);
            }
            window.location.href = data.role === "provider" ? "provider.html" : "dashboard.html";
        } catch (err) {
            console.error("Login error:", err);
            alert("Could not connect to server. Please try again.");
        }
    }
}

const auth = new Auth();

function showPasswordHelp() { auth.showPasswordHelp(); }
function hidePasswordHelp() { auth.hidePasswordHelp(); }

//newly made check box system. NEW AND IMPORVED
function setupCheckboxes() {
    const patient = document.getElementById("patient");
    const provider = document.getElementById("medical-providor");

    if (!patient || !provider) return;

    patient.addEventListener("change", () => {
        if (patient.checked) provider.checked = false;
    });

    provider.addEventListener("change", () => {
        if (provider.checked) patient.checked = false;
    });
}

setupCheckboxes();