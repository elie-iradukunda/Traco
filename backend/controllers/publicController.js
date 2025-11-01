import { pool } from "../db.js";

export const login = async (req, res) => {
  const { fullName } = req.query;
  try {
    const result = await pool.query("SELECT * FROM users WHERE full_name=$1", [fullName]);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
