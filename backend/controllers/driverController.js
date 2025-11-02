import { pool } from "../db.js";

// Get driver ID from user ID
export const getDriverIdByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT driver_id FROM drivers WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Driver not found for this user" });
    }

    res.json({ driver_id: result.rows[0].driver_id });
  } catch (err) {
    console.error("Error getting driver ID:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

export const getDriverAssignments = async (req, res) => {
  try {
    // Support both driver_id (from params) and user_id (from token)
    let driverId = req.params.driverId;
    
    // If driverId is actually a user_id (when called from frontend), get the driver_id
    if (driverId) {
      // Check if it's a user_id or driver_id
      const driverCheck = await pool.query(
        `SELECT driver_id, user_id FROM drivers WHERE driver_id = $1 OR user_id = $1`,
        [driverId]
      );

      if (driverCheck.rows.length > 0) {
        // If we found by user_id, use the driver_id
        if (driverCheck.rows[0].user_id === parseInt(driverId)) {
          driverId = driverCheck.rows[0].driver_id;
        }
      } else {
        return res.status(404).json({ error: "Driver not found" });
      }
    } else if (req.user) {
      // Try to get driver_id from user_id in token
      const driverCheck = await pool.query(
        `SELECT driver_id FROM drivers WHERE user_id = $1`,
        [req.user.user_id]
      );

      if (!driverCheck.rows.length) {
        return res.status(404).json({ error: "Driver not found for this user" });
      }
      driverId = driverCheck.rows[0].driver_id;
    } else {
      return res.status(400).json({ error: "Driver ID or user authentication required" });
    }

    // Get routes assigned to this driver (through vehicles)
    const routesResult = await pool.query(`
      SELECT 
        r.route_id,
        r.route_name,
        r.start_location,
        r.end_location,
        r.distance_km,
        r.fare_base,
        r.assigned_vehicle,
        r.status AS route_status,
        v.plate_number,
        v.model AS vehicle_model,
        v.vehicle_id,
        v.status AS vehicle_status,
        v.assigned_driver
      FROM routes r
      LEFT JOIN vehicles v ON r.assigned_vehicle = v.vehicle_id OR v.assigned_route = r.route_id
      WHERE v.assigned_driver = $1
      ORDER BY r.route_id ASC
    `, [driverId]);

    // Also check if driver has assigned_line_id in drivers table
    const driverLineResult = await pool.query(`
      SELECT 
        d.assigned_line_id,
        r.route_id,
        r.route_name,
        r.start_location,
        r.end_location,
        r.status AS route_status,
        v.plate_number,
        v.model AS vehicle_model,
        v.vehicle_id,
        v.status AS vehicle_status
      FROM drivers d
      LEFT JOIN routes r ON d.assigned_line_id = r.route_id
      LEFT JOIN vehicles v ON r.assigned_vehicle = v.vehicle_id
      WHERE d.driver_id = $1 AND d.assigned_line_id IS NOT NULL
    `, [driverId]);

    // Combine results
    const allAssignments = [...routesResult.rows, ...driverLineResult.rows];
    
    // Remove duplicates based on route_id
    const uniqueAssignments = allAssignments.filter((route, index, self) =>
      index === self.findIndex((r) => r.route_id === route.route_id)
    );

    // Add acceptance status (default to true if assigned)
    const assignmentsWithStatus = uniqueAssignments.map(assignment => ({
      ...assignment,
      accepted: true, // Default to accepted if assigned
      assigned_at: new Date().toISOString() // Add timestamp
    }));

    res.json(assignmentsWithStatus);
  } catch (err) {
    console.error("Error fetching driver assignments:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};
