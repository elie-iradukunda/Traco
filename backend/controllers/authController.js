import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // use env in production

// Passenger Registration
export const registerPassenger = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    const existing = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role) 
       VALUES ($1,$2,$3,$4,'passenger') RETURNING user_id, full_name, email, phone, role, created_at`,
      [full_name, email, phone, hashedPassword]
    );

    res
      .status(201)
      .json({ message: "Passenger registered", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login (Passenger, Driver, Admin)
// Login (Passenger, Driver, Admin)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];

    // Use correct column name here
    if (!user.password_hash)
      return res.status(400).json({ error: "Password not set for this account" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ message: "Login success", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};


