// backend/createAdmin.js
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const createAdmin = async () => {
  try {
    const full_name = "Jane Admin";         // Admin name
    const email = "jane.admin@camny.com";   // Admin email
    const phone = "1111111111";             // Phone
    const password = "admin123";            // Plain password
    const role = "admin";

    // Check if admin already exists
    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      console.log("Admin already exists");
      process.exit();
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin into database
    await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [full_name, email, phone, hashedPassword, role]
    );

    console.log("Admin created successfully");
    process.exit();
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

createAdmin();
