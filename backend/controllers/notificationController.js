import { pool } from "../db.js";

export const getUserNotifications = async (req, res) => {
  const userId = req.params.userId;
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id=$1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { user_id, message, title } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ error: "user_id and message are required" });
    }

    // Check if user exists
    const userCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1`,
      [user_id]
    );

    if (!userCheck.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, message, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, message, title || null]
    );

    res.status(201).json({
      message: "Notification sent successfully",
      notification: result.rows[0]
    });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ error: "Failed to send notification", details: err.message });
  }
};
