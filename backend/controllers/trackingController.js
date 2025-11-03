import { pool } from "../db.js";

const getDriverIdFromUserId = async (userId) => {
  const result = await pool.query(
    `SELECT driver_id FROM drivers WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].driver_id : null;
};

export const updateVehicleLocation = async (req, res) => {
  try {
    const { 
      vehicle_id, 
      latitude, 
      longitude, 
      current_location, 
      speed, 
      heading, 
      estimated_arrival 
    } = req.body;

    if (!vehicle_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: "Vehicle ID, latitude, and longitude are required" 
      });
    }

    const driverId = req.user ? await getDriverIdFromUserId(req.user.user_id) : null;

    if (driverId) {
      const vehicleCheck = await pool.query(
        `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND assigned_driver = $2`,
        [vehicle_id, driverId]
      );

      if (!vehicleCheck.rows.length) {
        return res.status(403).json({ error: "You are not assigned to this vehicle" });
      }
    }

    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('vehicle_tracking', 'vehicle_location_live')
    `);
    
    const tables = tableCheck.rows.map(row => row.table_name);
    const hasTrackingTable = tables.includes('vehicle_tracking');
    const hasLiveTable = tables.includes('vehicle_location_live');

    if (!hasTrackingTable && !hasLiveTable) {
      return res.status(500).json({ 
        error: "GPS tracking tables not available. Please run migrations." 
      });
    }

    if (hasTrackingTable) {
      await pool.query(`
        INSERT INTO vehicle_tracking (
          vehicle_id, driver_id, current_location, latitude, longitude, 
          speed, heading, estimated_arrival
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        vehicle_id, 
        driverId, 
        current_location, 
        latitude, 
        longitude, 
        speed || null, 
        heading || null, 
        estimated_arrival || null
      ]);
    }

    if (hasLiveTable) {
      await pool.query(`
        INSERT INTO vehicle_location_live (
          vehicle_id, driver_id, current_location, latitude, longitude, 
          speed, heading, estimated_arrival, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (vehicle_id) 
        DO UPDATE SET 
          driver_id = $2,
          current_location = $3,
          latitude = $4,
          longitude = $5,
          speed = $6,
          heading = $7,
          estimated_arrival = $8,
          last_updated = CURRENT_TIMESTAMP
      `, [
        vehicle_id, 
        driverId, 
        current_location, 
        latitude, 
        longitude, 
        speed || null, 
        heading || null, 
        estimated_arrival || null
      ]);
    }

    const passengersResult = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        COALESCE(t.passenger_phone, u.phone) AS passenger_phone,
        COALESCE(t.passenger_email, u.email) AS passenger_email,
        u.user_id
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
        AND (t.journey_status = 'in_progress' OR t.journey_status IS NULL)
    `, [vehicle_id]);

    const notificationPromises = passengersResult.rows.map(async (passenger) => {
      let targetUserId = passenger.user_id || passenger.passenger_id;
      
      if (!targetUserId && passenger.passenger_phone) {
        const phoneUser = await pool.query(
          `SELECT user_id FROM users WHERE phone = $1 LIMIT 1`,
          [passenger.passenger_phone]
        ).catch(() => ({ rows: [] }));
        if (phoneUser.rows.length > 0) {
          targetUserId = phoneUser.rows[0].user_id;
        }
      }

      if (targetUserId) {
        return pool.query(
          `INSERT INTO notifications (user_id, message, title)
           VALUES ($1, $2, $3)`,
          [
            targetUserId,
            `Location update: ${current_location || `${latitude}, ${longitude}`}. ${estimated_arrival ? `ETA: ${estimated_arrival}` : ''}`,
            "Vehicle Location Update"
          ]
        ).catch(() => null);
      }
      
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: {
        latitude,
        longitude,
        current_location,
        speed,
        heading,
        estimated_arrival
      },
      timestamp: new Date().toISOString(),
      passengers_notified: passengersResult.rows.length
    });
  } catch (err) {
    console.error("Error updating vehicle location:", err);
    res.status(500).json({ error: "Failed to update location", details: err.message });
  }
};

export const getVehicleLocation = async (req, res) => {
  try {
    const { vehicle_id } = req.params;

    if (!vehicle_id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'vehicle_location_live'
    `);

    if (!tableCheck.rows.length) {
      return res.status(500).json({ 
        error: "GPS tracking not available. Please run migrations." 
      });
    }

    const locationResult = await pool.query(`
      SELECT 
        vl.vehicle_id,
        vl.current_location,
        vl.latitude,
        vl.longitude,
        vl.speed,
        vl.heading,
        vl.estimated_arrival,
        vl.last_updated,
        v.plate_number,
        v.model,
        v.capacity,
        r.route_name,
        r.start_location,
        r.end_location
      FROM vehicle_location_live vl
      JOIN vehicles v ON vl.vehicle_id = v.vehicle_id
      LEFT JOIN routes r ON v.assigned_route = r.route_id
      WHERE vl.vehicle_id = $1
    `, [vehicle_id]);

    if (!locationResult.rows.length) {
      return res.status(404).json({ error: "Vehicle location not available" });
    }

    res.status(200).json(locationResult.rows[0]);
  } catch (err) {
    console.error("Error getting vehicle location:", err);
    res.status(500).json({ error: "Failed to get location", details: err.message });
  }
};

export const getAllVehicleLocations = async (req, res) => {
  try {
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'vehicle_location_live'
    `);

    if (!tableCheck.rows.length) {
      return res.status(500).json({ 
        error: "GPS tracking not available. Please run migrations." 
      });
    }

    const locationsResult = await pool.query(`
      SELECT 
        vl.vehicle_id,
        vl.current_location,
        vl.latitude,
        vl.longitude,
        vl.speed,
        vl.heading,
        vl.estimated_arrival,
        vl.last_updated,
        v.plate_number,
        v.model,
        v.capacity,
        v.status AS vehicle_status,
        r.route_id,
        r.route_name,
        r.start_location,
        r.end_location,
        d.driver_id,
        u.full_name AS driver_name
      FROM vehicle_location_live vl
      JOIN vehicles v ON vl.vehicle_id = v.vehicle_id
      LEFT JOIN routes r ON v.assigned_route = r.route_id
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      ORDER BY vl.last_updated DESC
    `);

    res.status(200).json(locationsResult.rows);
  } catch (err) {
    console.error("Error getting all vehicle locations:", err);
    res.status(500).json({ error: "Failed to get locations", details: err.message });
  }
};

export const getVehicleLocationHistory = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'vehicle_tracking'
    `);

    if (!tableCheck.rows.length) {
      return res.status(500).json({ 
        error: "GPS tracking history not available. Please run migrations." 
      });
    }

    const historyResult = await pool.query(`
      SELECT 
        tracking_id,
        vehicle_id,
        current_location,
        latitude,
        longitude,
        speed,
        heading,
        estimated_arrival,
        created_at
      FROM vehicle_tracking
      WHERE vehicle_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [vehicle_id, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM vehicle_tracking
      WHERE vehicle_id = $1
    `, [vehicle_id]);

    res.status(200).json({
      history: historyResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error("Error getting vehicle location history:", err);
    res.status(500).json({ error: "Failed to get location history", details: err.message });
  }
};

export const getMyVehicleLocation = async (req, res) => {
  try {
    const { ticket_id } = req.params;

    if (!ticket_id) {
      return res.status(400).json({ error: "Ticket ID is required" });
    }

    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'vehicle_location_live'
    `);

    if (!tableCheck.rows.length) {
      return res.status(500).json({ 
        error: "GPS tracking not available. Please run migrations." 
      });
    }

    const ticketResult = await pool.query(`
      SELECT 
        t.ticket_id,
        t.vehicle_id,
        t.route_id,
        t.passenger_id,
        t.seat_number,
        t.travel_date,
        v.plate_number,
        v.model AS vehicle_model,
        r.route_name,
        r.start_location,
        r.end_location
      FROM tickets t
      JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      JOIN routes r ON t.route_id = r.route_id
      WHERE t.ticket_id = $1
    `, [ticket_id]);

    if (!ticketResult.rows.length) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    if (req.user && ticket.passenger_id !== req.user.user_id) {
      return res.status(403).json({ error: "Unauthorized to view this ticket's vehicle" });
    }

    const locationResult = await pool.query(`
      SELECT 
        vl.vehicle_id,
        vl.current_location,
        vl.latitude,
        vl.longitude,
        vl.speed,
        vl.heading,
        vl.estimated_arrival,
        vl.last_updated
      FROM vehicle_location_live vl
      WHERE vl.vehicle_id = $1
    `, [ticket.vehicle_id]);

    if (!locationResult.rows.length) {
      return res.status(200).json({
        ticket: ticket,
        location: null,
        message: "Vehicle location not yet available"
      });
    }

    res.status(200).json({
      ticket: ticket,
      location: locationResult.rows[0]
    });
  } catch (err) {
    console.error("Error getting my vehicle location:", err);
    res.status(500).json({ error: "Failed to get vehicle location", details: err.message });
  }
};
