import { pool } from "../db.js";

// Browse all routes
export const getAllRoutes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM routes");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// Get tickets for a passenger
export const getPassengerTickets = async (req, res) => {
  const passengerId = req.params.passengerId;
  try {
    const result = await pool.query(`
      SELECT t.*, r.route_name, v.plate_number
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.passenger_id = $1
    `, [passengerId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
