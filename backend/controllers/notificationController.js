import { pool } from "../db.js";

export const getUserNotifications = async (req, res) => {
  const userId = req.params.userId;
  try {
    const result = await pool.query("SELECT * FROM notifications WHERE user_id=$1", [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
