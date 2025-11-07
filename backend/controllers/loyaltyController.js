import { pool } from "../db.js";

// Get or create loyalty points for a passenger
export const getLoyaltyPoints = async (req, res) => {
  try {
    const { passenger_id } = req.params;

    // Check if loyalty_points table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'loyalty_points'
      )
    `);

    if (!tableCheck.rows[0]?.exists) {
      // Create loyalty_points table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS loyalty_points (
          loyalty_id SERIAL PRIMARY KEY,
          passenger_id INTEGER REFERENCES users(user_id) UNIQUE,
          total_points INTEGER DEFAULT 0,
          redeemed_points INTEGER DEFAULT 0,
          available_points INTEGER DEFAULT 0,
          tier VARCHAR(20) DEFAULT 'bronze',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    let result = await pool.query(
      `SELECT * FROM loyalty_points WHERE passenger_id = $1`,
      [passenger_id]
    );

    if (result.rows.length === 0) {
      // Create new loyalty record
      await pool.query(
        `INSERT INTO loyalty_points (passenger_id, total_points, available_points, tier)
         VALUES ($1, 0, 0, 'bronze')`,
        [passenger_id]
      );
      result = await pool.query(
        `SELECT * FROM loyalty_points WHERE passenger_id = $1`,
        [passenger_id]
      );
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching loyalty points:", err);
    res.status(500).json({ error: "Failed to fetch loyalty points", details: err.message });
  }
};

// Add loyalty points (called when ticket is paid)
export const addLoyaltyPoints = async (req, res) => {
  try {
    const { passenger_id, points, reason } = req.body;

    if (!passenger_id || !points) {
      return res.status(400).json({ error: "passenger_id and points are required" });
    }

    // Ensure loyalty record exists
    const existingCheck = await pool.query(
      `SELECT * FROM loyalty_points WHERE passenger_id = $1`,
      [passenger_id]
    );
    if (existingCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO loyalty_points (passenger_id, total_points, available_points, tier)
         VALUES ($1, 0, 0, 'bronze')`,
        [passenger_id]
      );
    }

    // Add points
    const result = await pool.query(
      `UPDATE loyalty_points 
       SET total_points = total_points + $1,
           available_points = available_points + $1,
           tier = CASE
             WHEN total_points + $1 >= 10000 THEN 'platinum'
             WHEN total_points + $1 >= 5000 THEN 'gold'
             WHEN total_points + $1 >= 1000 THEN 'silver'
             ELSE 'bronze'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE passenger_id = $2
       RETURNING *`,
      [points, passenger_id]
    );

    // Log transaction
    const transactionCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'loyalty_transactions'
      )
    `);

    if (!transactionCheck.rows[0]?.exists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
          transaction_id SERIAL PRIMARY KEY,
          passenger_id INTEGER REFERENCES users(user_id),
          points INTEGER,
          type VARCHAR(20) CHECK (type IN ('earned', 'redeemed')),
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    await pool.query(
      `INSERT INTO loyalty_transactions (passenger_id, points, type, reason)
       VALUES ($1, $2, 'earned', $3)`,
      [passenger_id, points, reason || 'Ticket purchase']
    );

    res.status(200).json({ message: "Points added successfully", loyalty: result.rows[0] });
  } catch (err) {
    console.error("Error adding loyalty points:", err);
    res.status(500).json({ error: "Failed to add loyalty points", details: err.message });
  }
};

// Redeem loyalty points
export const redeemLoyaltyPoints = async (req, res) => {
  try {
    const { passenger_id, points, reason } = req.body;

    if (!passenger_id || !points) {
      return res.status(400).json({ error: "passenger_id and points are required" });
    }

    // Check available points
    const current = await pool.query(
      `SELECT available_points FROM loyalty_points WHERE passenger_id = $1`,
      [passenger_id]
    );

    if (!current.rows.length) {
      return res.status(404).json({ error: "Loyalty account not found" });
    }

    if (current.rows[0].available_points < points) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    // Redeem points
    const result = await pool.query(
      `UPDATE loyalty_points 
       SET redeemed_points = redeemed_points + $1,
           available_points = available_points - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE passenger_id = $2
       RETURNING *`,
      [points, passenger_id]
    );

    // Log transaction
    await pool.query(
      `INSERT INTO loyalty_transactions (passenger_id, points, type, reason)
       VALUES ($1, $2, 'redeemed', $3)`,
      [passenger_id, points, reason || 'Points redemption']
    );

    res.status(200).json({ message: "Points redeemed successfully", loyalty: result.rows[0] });
  } catch (err) {
    console.error("Error redeeming loyalty points:", err);
    res.status(500).json({ error: "Failed to redeem loyalty points", details: err.message });
  }
};

// Get loyalty transaction history
export const getLoyaltyHistory = async (req, res) => {
  try {
    const { passenger_id } = req.params;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT * FROM loyalty_transactions 
       WHERE passenger_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [passenger_id, parseInt(limit)]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching loyalty history:", err);
    res.status(500).json({ error: "Failed to fetch loyalty history", details: err.message });
  }
};

