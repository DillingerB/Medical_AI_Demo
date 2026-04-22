class Auth {

    //shows password help
    showPasswordHelp() {
        //calling hint password from server
        const hint = document.getElementById("passwordHint");
        //displays the hint
        hint.innerText = "Password must be 8-20 characters";
        //hint is active
        hint.classList.add("active");
    }

    //hides password help
    hidePasswordHelp() {
        //removes the active hint, till user clicks the "password" box
        document.getElementById("passwordHint").classList.remove("active");
    }

    //validation for test cases
    validateAuth(username, password, checkRole= false) {
        //the user is set to valid
        let valid = true;

        //calls the stored errors for user and password
        const userError = document.getElementById("userError");
        const passError = document.getElementById("passError");

        //errors are hidden in UI
        userError.innerText = "";
        passError.innerText = "";
        userError.classList.remove("active");
        passError.classList.remove("active");

        //If there is no username, then show error
        if (!username) {
            userError.innerText = "Username must be filled in.";
            userError.classList.add("active");
            valid = false;

        //if the username is longer than 50 characters, then username is too long.
        } else if (username.length > 50) {
            userError.innerText = "Username too long.";
            userError.classList.add("active");
            valid = false;
        }

        //if password is not filled throw error
        if (!password) {
            passError.innerText = "Password must be filled in.";
            passError.classList.add("active");
            valid = false;

        // if password is shorter than 8 characters OR longer than 20 characters, throw error
        } else if (password.length < 8 || password.length >20) {
            passError.innerText = "Password must be 8-20 characters";
            passError.classList.add("active");
            valid = false;
        }

        //Check users role (patient or provider)
        if (checkRole) {
            const patient = document.getElementById("patient")?.checked;
            const provider = document.getElementById("medical-providor")?.checked;
            const roleErorr = document.getElementById("roleError");

            roleErorr.innerText = "";
            roleErorr.classList.remove("active");

            //if neither feild is selected, throw error
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

        //checks if patient is checked
        const patient  = document.getElementById("patient").checked;
        //checks if provider is checked
        const provider = document.getElementById("medical-providor").checked;
        //whichever is checked, that is their role from now on.
        const role = provider ? "provider" : "patient";

        //load from server, and try to sign new user up
        try {
            //fetch authentication signup from server
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, role }),
            });

            //await for server to speak to authentication.
            const data = await res.json();

            //if data is corrupted/data is unreachable(offline), send error
            if (!res.ok) {
                document.getElementById("userError").innerText = data.error || "Signup failed.";
                document.getElementById("userError").classList.add("active");
                return;
            }

            //if provider, send alert as provider code.
            if (data.provider_code) {
                alert(`Your provider code is: ${data.provider_code}\nShare this with your patients so they can link to you.`);
            }

            //Store the username for use (on provider/patient html)
            sessionStorage.setItem("user", username);
            //store the providers role for their html page
            sessionStorage.setItem("role", data.role);

            //if user is provider, store their provider code to link users
            if (data.provider_code) {
                sessionStorage.setItem("provider_code", data.provider_code);
            }

            //if provider, go to provider page (provider.html), else go to patient page (dashboard.html)
            window.location.href = data.role === "provider" ? "provider.html" : "dashboard.html";
        //if server cannot be reacher (server error) throw this message/alert
        } catch (err) {
            console.error("Signup error:", err);
            alert("Could not connect to server. Please try again.");
        }
    }

    //login
    async login() {
        const { username, password } = this.getCredentials();
        //if their credentials are not valid, return.
        if (!this.validateAuth(username, password)) return;

        //connect to login side of server
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            //await for data to be done retrieving
            const data = await res.json();

            //if data error / not saved in data base, throw this error
            if (!res.ok) {
                document.getElementById("passError").innerText = data.error || "Invalid credentials.";
                document.getElementById("passError").classList.add("active");
                return;
            }

            //sotre username/role
            sessionStorage.setItem("user", username);
            sessionStorage.setItem("role", data.role);
            if (data.provider_code) {
                sessionStorage.setItem("provider_code", data.provider_code);
            }
            window.location.href = data.role === "provider" ? "provider.html" : "dashboard.html";

        //cannot login through server, throw the connection error.
        } catch (err) {
            console.error("Login error:", err);
            alert("Could not connect to server. Please try again.");
        }
    }
}

const auth = new Auth();

//shows and hides password help once clicked in box.
function showPasswordHelp() { auth.showPasswordHelp(); }
function hidePasswordHelp() { auth.hidePasswordHelp(); }

//newly made check box system. NEW AND IMPORVED
function setupCheckboxes() {
    //patient is set to patient, provider is set to medical provider
    const patient = document.getElementById("patient");
    const provider = document.getElementById("medical-providor");

    //if neither box is checked, return
    if (!patient || !provider) return;

    //if the patient is checked, as well as provider, uncheck provider, check patient
    patient.addEventListener("change", () => {
        if (patient.checked) provider.checked = false;
    });

    //if provider ais checked, as well as patient, uncheck patient, check provider.
    provider.addEventListener("change", () => {
        if (provider.checked) patient.checked = false;
    });
}

//sets up the check boxes for user on index page.
setupCheckboxes();