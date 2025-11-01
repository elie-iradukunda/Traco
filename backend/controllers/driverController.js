import { pool } from "../db.js";

export const getDriverAssignments = async (req, res) => {
  const driverId = req.params.driverId;
  try {
    const result = await pool.query(`
      SELECT da.*, r.route_name, v.plate_number
      FROM driver_assignments da
      JOIN routes r ON da.route_id = r.route_id
      LEFT JOIN vehicles v ON r.route_id = v.assigned_route
      WHERE da.driver_id = $1
    `, [driverId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
