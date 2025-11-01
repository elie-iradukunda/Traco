import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const createUser = async () => {
  try {
    const email = "elie@gmail.com"; // new user email
    const role = "driver"; // role: driver or passenger

    // Check if user already exists
    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      console.log("User already exists");
      process.exit();
    }

    // Hash the password
    const hashed = await bcrypt.hash("pass", 10);

    // Insert user
    await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5)`,
      ["elie", email, "11199999", hashed, role]
    );

    console.log("User created successfully");
    process.exit();
  } catch (err) {
    console.error("Error creating user:", err);
    process.exit(1);
  }
};

createUser();
