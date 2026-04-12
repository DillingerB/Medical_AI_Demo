
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

//signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
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

    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, hash]
    );

    res.status(201).json({ message: "Account created." });
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
      "SELECT id, password_hash FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const match = await bcrypt.compare(password, rows[0].password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    res.json({ message: "Login successful." });
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
      `SELECT p.id, p.name, p.dosage, p.type, p.value, p.last_taken
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

  const { name, dosage, type, value } = req.body;

  if (!name || !dosage || !type || value == null) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [[user]] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (!user) return res.status(401).json({ error: "User not found." });

    const [existing] = await pool.query(
      "SELECT name FROM prescriptions WHERE user_id = ?",
      [user.id]
    );

    const interactions = [];
    for (const ex of existing) {
      const [rows] = await pool.query(
        `SELECT severity, description FROM drug_interactions WHERE (med_a = ? AND med_b = ?) OR (med_a = ? AND med_b = ?)`,
        [name, ex.name, ex.name, name]
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
      "INSERT INTO prescriptions (user_id, name, dosage, type, value) VALUES (?, ?, ?, ?, ?)",
      [user.id, name, dosage, type, value]
    );

    res.status(201).json({
      id: result.insertId,
      name, 
      dosage, 
      type, 
      value,
      last_taken: null,
      interactions,
    });
  } catch (err) {
    console.error("Add prescription error:", err);
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

//actualy server
app.listen(PORT, () => {
  console.log(`MedAI server running at http://localhost:${PORT}`);
});
