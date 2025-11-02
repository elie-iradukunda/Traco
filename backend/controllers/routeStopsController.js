import { pool } from "../db.js";

// Get all stops for a route
export const getRouteStops = async (req, res) => {
  try {
    const { routeId } = req.params;
    const result = await pool.query(`
      SELECT 
        stop_id,
        route_id,
        stop_name,
        stop_order,
        distance_from_start_km,
        fare_from_start,
        latitude,
        longitude
      FROM route_stops
      WHERE route_id = $1
      ORDER BY stop_order ASC
    `, [routeId]);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching route stops:", err);
    res.status(500).json({ error: "Failed to fetch route stops", details: err.message });
  }
};

// Add a stop to a route
export const addRouteStop = async (req, res) => {
  try {
    const { route_id, stop_name, stop_order, distance_from_start_km, fare_from_start, latitude, longitude } = req.body;

    if (!route_id || !stop_name || stop_order === undefined) {
      return res.status(400).json({ error: "route_id, stop_name, and stop_order are required" });
    }

    const result = await pool.query(`
      INSERT INTO route_stops (route_id, stop_name, stop_order, distance_from_start_km, fare_from_start, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [route_id, stop_name, stop_order, distance_from_start_km || 0, fare_from_start || 0, latitude || null, longitude || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding route stop:", err);
    res.status(500).json({ error: "Failed to add route stop", details: err.message });
  }
};

// Update a route stop
export const updateRouteStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    const { stop_name, stop_order, distance_from_start_km, fare_from_start, latitude, longitude } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (stop_name !== undefined) {
      updates.push(`stop_name = $${paramCount++}`);
      values.push(stop_name);
    }
    if (stop_order !== undefined) {
      updates.push(`stop_order = $${paramCount++}`);
      values.push(stop_order);
    }
    if (distance_from_start_km !== undefined) {
      updates.push(`distance_from_start_km = $${paramCount++}`);
      values.push(distance_from_start_km);
    }
    if (fare_from_start !== undefined) {
      updates.push(`fare_from_start = $${paramCount++}`);
      values.push(fare_from_start);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(longitude);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(stopId);
    const query = `UPDATE route_stops SET ${updates.join(", ")} WHERE stop_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Route stop not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error updating route stop:", err);
    res.status(500).json({ error: "Failed to update route stop", details: err.message });
  }
};

// Delete a route stop
export const deleteRouteStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    const result = await pool.query(`DELETE FROM route_stops WHERE stop_id = $1 RETURNING *`, [stopId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Route stop not found" });
    }

    res.status(200).json({ message: "Route stop deleted successfully" });
  } catch (err) {
    console.error("Error deleting route stop:", err);
    res.status(500).json({ error: "Failed to delete route stop", details: err.message });
  }
};

// Calculate fare between two stops
export const calculateFareBetweenStops = async (req, res) => {
  try {
    const { routeId, startStopId, endStopId } = req.params;

    // Get both stops
    const stopsResult = await pool.query(`
      SELECT stop_id, stop_order, fare_from_start, distance_from_start_km
      FROM route_stops
      WHERE route_id = $1 AND (stop_id = $2 OR stop_id = $3)
      ORDER BY stop_order ASC
    `, [routeId, startStopId, endStopId]);

    if (stopsResult.rows.length !== 2) {
      return res.status(400).json({ error: "Both start and end stops must be found" });
    }

    const [startStop, endStop] = stopsResult.rows.sort((a, b) => a.stop_order - b.stop_order);

    // Calculate fare difference
    const fare = Math.abs(endStop.fare_from_start - startStop.fare_from_start);
    const distance = Math.abs(endStop.distance_from_start_km - startStop.distance_from_start_km);

    res.status(200).json({
      fare: fare,
      distance: distance,
      start_stop: startStop,
      end_stop: endStop
    });
  } catch (err) {
    console.error("Error calculating fare:", err);
    res.status(500).json({ error: "Failed to calculate fare", details: err.message });
  }
};

