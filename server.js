require("dotenv").config();

const express = require("express");
const bcrypt  = require("bcrypt");
const path    = require("path");
const pool    = require("./db");

const app         = express();
const PORT        = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getCurrentUser(req) {
  return req.headers["x-username"] || null;
}

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

//signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if ( username > 50 ) {
    return res.status(400).json({ error: "Username must be less than 50 characters."});
  }

  try {
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (rows.length > 0) {
      return res.status(409).json({ error: "Username already taken." });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const providerCode = role === "provider" ? generateCode() : null;

    await pool.query(
      "INSERT INTO users (username, role, provider_code, password_hash) VALUES (?, ?, ?, ?)",
      [username, role, providerCode, hash]
    );

    res.status(201).json({ 
      message: "Account created.",
      role: role,
      provider_code: providerCode,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, password_hash, role, provider_code FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const match = await bcrypt.compare(password, rows[0].password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    res.json({ 
      message: "Login successful.",
      role: rows[0].role,
      provider_code: rows[0].provider_code,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//prescriptions
app.get("/api/prescriptions", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.dosage, p.type, p.value, p.amount, p.last_taken
       FROM prescriptions p
       JOIN users u ON u.id = p.user_id
       WHERE u.username = ?
       ORDER BY p.created_at DESC`,
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get prescriptions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//prescription card
app.post("/api/prescriptions", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  const { name, dosage, type, value, amount } = req.body;

  if (!name || !dosage || !type || value == null) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (value < 0) {
    return res.status(400).json({ error: "Value must be greater than 0." });
  }

  try {
    const [[user]] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (!user) return res.status(401).json({ error: "User not found." });

    const [[brand]] = await pool.query(
      "SELECT generic_name FROM brand_names WHERE brand_name = ?",
      [name]
    ).catch(() => [[null]]);

    const genericName = brand ? brand.generic_name : name;

    const [existing] = await pool.query(
      "SELECT name FROM prescriptions WHERE user_id = ?",
      [user.id]
    );

    const interactions = [];
    for (const ex of existing) {

      const [[exBrand]] = await pool.query(
        "SELECT generic_name FROM brand_names WHERE brand_name = ?",
        [ex.name]
      ).catch(() => [[null]]);

      const exGeneric = exBrand ? exBrand.generic_name : ex.name;

      const [rows] = await pool.query(
        `SELECT severity, description 
        FROM drug_interactions 
        WHERE (med_a = ? AND med_b = ?) OR (med_a = ? AND med_b = ?)`,
        [genericName, exGeneric, exGeneric, genericName]
      );
      if (rows.length > 0) {
        interactions.push({
          with: ex.name,
          severity: rows[0].severity,
          description: rows[0].description,
        });
      }
    }

    const [result] = await pool.query(
      "INSERT INTO prescriptions (user_id, name, dosage, type, value, amount) VALUES (?, ?, ?, ?, ?, ?)",
      [user.id, name, dosage, type, value, amount]
    );

    const dosageWarnings = [];

    const dosageMatch = dosage.match(/(\d+(\.\d+)?)/);
    const dosagePerPill = dosageMatch ? parseFloat(dosageMatch[1]) : null;
    const dosageAmount = dosagePerPill ? dosagePerPill * amount : null;

    if (dosageAmount) {
      const [[dosageBrand]] = await pool.query(
        "SELECT generic_name FROM brand_names WHERE brand_name = ?", [name]
      ).catch(() => [[null]]);

      const isOTC = !!dosageBrand;
      const dosageGeneric = dosageBrand ? dosageBrand.generic_name : name;

      const [[limit]] = await pool.query(
        "SELECT max_single, max_daily, max_single_otc, max_daily_otc, unit FROM dosage_limits WHERE generic_name = ?",
        [dosageGeneric]
      ).catch(() => [[null]]);

      if (limit) {

        const maxSingle = (isOTC && limit.max_single_otc) ? limit.max_single_otc : limit.max_single;
        const maxDaily = (isOTC && limit.max_single_otc) ? limit.max_daily_otc : limit.max_daily;
        const limitType = isOTC ? "OTC" : "prescribed";

        if (dosageAmount > maxSingle) {
          dosageWarnings.push({
            type: "single",
            message: `Single ${limitType} does of ${dosageAmount}${limit.unit}  (${amount} pill(s) x ${dosagePerPill}${limit.unit})exceeds safe limit of ${maxSingle}${limit.unit} for ${name}.`,
          });
        }

        const dosesPerDay = type === "daily" ? 1 : Math.floor(24 / value);
        const dailyTotal = dosageAmount * dosesPerDay;

        if (dailyTotal > maxDaily) {
          dosageWarnings.push({
            type: "daily",
            message: `Daily ${limitType} total of ${dailyTotal}${limit.unit} (${dosesPerDay} doses x ${amount} pill(s) x ${dosagePerPill}${limit.unit}) exceeds safe daily limit of ${maxDaily}${limit.unit} for ${name}.`,
          });
        }
      }
    }

    res.status(201).json({
      id: result.insertId,
      name, dosage, type, value, amount,
      last_taken: null,
      interactions,
      dosageWarnings,
    });
  } catch (err) {
    console.error("Add prescription error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//provider sending prescrption to patient.
app.post("/api/prescriptions/send", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated."});

  const { patientUsername, name, dosage, type, value, amount } = req.body;

  if (!patientUsername || !name || !dosage || !type || !value == null) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [[provider]] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND role = 'provider'", [username]
    );
    if (!provider) return res.status(403).json({ error: "Only providers send prescriptions." });

    const [[patient]] = await pool.query(
      `SELECT u.id FROM users u
      JOIN patient_provider pp ON pp.patient_id = u.id
      WHERE u.username = ? AND pp.provider_id = ? AND u.role = 'patient'`,
      [patientUsername, provider.id]
    );
    if (!patient) return res.status(404).json({ error: "Patient not found or not linked to you." });

    const [[brand]] = await pool.query(
      "SELECT generic_name FROM brand_names WHERE brand_name = ?", [name]
    ).catch(() => [[null]]);
    const genericName = brand ? brand.generic_name : name;

    const [existing] = await pool.query(
      "SELECT name FROM prescriptions WHERE user_id = ?", [patient.id]
    );

    const interactions = [];
    for (const ex of existing) {
      const [[exBrand]] = await pool.query(
        "SELECT generic_name FROM brand_names WHERE brand_name = ?", [ex.name]
      ).catch(() => [[null]]);
      const exGeneric = exBrand ? exBrand.generic_name : ex.name;

      const [rows] = await pool.query(
        `SELECT severity, description FROM drug_interactions
        WHERE (med_a = ? AND med_b = ?) OR (med_a = ? AND med_b = ?)`, 
        [genericName, exGeneric, exGeneric, genericName]
      );
      if (rows.length > 0) {
        interactions.push({
          with: ex.name,
          severity: rows[0].severity,
          description: rows[0].description,
        });
      }
    }

    const [result] = await pool.query(
      "INSERT INTO prescriptions (user_id, name, dosage, type, value, amount) VALUES (?, ?, ?, ?, ?, ?)",
      [patient.id, name, dosage, type, value, amount]
    );

    if (interactions.length > 0) {
      for (const i of interactions) {
        const msg = `${i.severity.toUpperCase()}: ${name} + ${i.with} - ${i.description} (Prescribed by ${username})`;
        await pool.query(
          "INSERT INTO alerts (user_id, message, severity) VALUES (?, ?, ?)",
          [patient.id, msg, i.severity]
        );
      }
    }

    await pool.query(
      "INSERT INTO alerts (user_id, message, severity) VALUES (?, ?, ?)",
      [patient.id, `New prescription from Dr. ${username}: ${name} ${dosage}`, "info"]
    );

    res.status(201).json({
      id: result.insertId,
      name, dosage, type, value,
      last_taken: null,
      interactions,
    });
  } catch (err) {
    console.error("Send prescription error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//take pill in prescriptions
app.post("/api/prescriptions/:id/take", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE prescriptions p
       JOIN users u ON u.id = p.user_id
       SET p.last_taken = NOW()
       WHERE p.id = ? AND u.username = ?`,
      [id, username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Prescription not found." });
    }

    res.json({ message: "Dose recorded." });
  } catch (err) {
    console.error("Take pill error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//delete button in prescriptions
app.delete("/api/prescriptions/:id", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE p FROM prescriptions p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ? AND u.username = ?`,
      [id, username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Prescription not found." });
    }

    res.json({ message: "Deleted." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/link", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated" });

  const { providerUsername, providerCode } = req.body;
  
  try {
    const [[patient]] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND role = 'patient'", [username]
    );
    if (!patient) return res.status(403).json ({ error: "Only patients can link to a provider." });

    const [[provider]] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND provider_code = ? AND role = 'provider'",
      [providerUsername, providerCode]
    );
    if (!provider) return res.status(404).json({ error: "Provider not found. Check the username and code." });

    await pool.query(
      "INSERT INTO patient_provider (patient_id, provider_id) VALUES (?, ?)",
      [patient.id, provider.id]
    );

    res.json({ message: `Successfully linked to Dr. ${providerUsername}.` });
  } catch (err) {
    console.error("Link error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/patients", async (req, res) => {
  const username = getCurrentUser(req);
  if(!username) return res.status(401).json({ error: "Not authenticated." });

  try {
    const [rows] = await pool.query(
      `SELECT u.username, u.id, p.id AS presc_id, p.name, p.dosage, p.type, p.value, p.amount, p.last_taken
      FROM users u
      JOIN patient_provider pp ON pp.patient_id = u.id
      JOIN users prov ON prov.id = pp.provider_id
      LEFT JOIN prescriptions p ON p.user_id = u.id
      WHERE prov.username = ?
      ORDER BY u.username, p.created_at DESC`,
      [username]
    );

    const patients = {};
    rows.forEach(row => {
      if (!patients[row.username]) {
        patients[row.username] = { username: row.username, id: row.id, prescriptions: [] };
      }
      if (row.presc_id) {
        patients[row.username].prescriptions.push({
          id: row.presc_id, name: row.name, dosage: row.dosage, type: row.type, value: row.value, amount: row.amount, last_taken: row.last_taken,
        });
      }
    });

    res.json(Object.values(patients));
  } catch (err) {
    console.error("Get patients error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/patients/:patientUsername/alerts", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  const { patientUsername } = req.params;

  try {
    const [[link]] = await pool.query(
      `SELECT pp.id FROM patient_provider pp
      JOIN users prov ON prov.id = pp.provider_id
      JOIN users pat ON pat.id = pp.patient_id
      WHERE prov.username = ? AND pat.username = ?`,
      [username, patientUsername]
    );
    if (!link) return res.status(403).json({ error: "Not linked to this patient." });

    const [rows] = await pool.query(
      `SELECT a.message, a.severity, a.created_at FROM alerts a
      JOIN users u ON u.id = a.user_id
      WHERE u.username = ?
      ORDER BY a.created_at DESC`,
      [patientUsername]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get patients alerts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Save alerts
app.post("/api/alerts", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({error: "Not authenticated."});

  const { message, severity } = req.body;

  try {
    const [[user]] = await pool.query(
      "SELECT id FROM users WHERE username = ?", [username]
    );

    await pool.query(
      "INSERT INTO alerts (user_id, message, severity) VALUES (?, ?, ?)",
      [user.id, message, severity]
    );

    res.status(201).json({message: "Alert saved."});
  } catch (err) {
    console.error("Save alert error:", err);
    res.status(500).json({ error: "Internal server error."});
  }
});

//get alerts
app.get("/api/alerts", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  try {
    const [rows] = await pool.query(
      `SELECT a.message, a.severity, a.created_at
      FROM alerts a
      JOIN users u on u.id = a.user_id
      WHERE u.username = ? ORDER BY a.created_at DESC`,
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get alerts error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/api/auth/delete", async (req, res) => {
  const username = getCurrentUser(req);
  if (!username) return res.status(401).json({ error: "Not authenticated." });

  try {
    const [result] = await pool.query(
      "DELETE FROM users WHERE username = ?", [username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found"});
    }

    res.json({message: "Account deleted"});
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Internal server error"});
  }
});

//actualy server
app.listen(PORT, () => {
  console.log(`MedAI server running at http://localhost:${PORT}`);
});