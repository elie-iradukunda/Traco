import { pool } from "../db.js";
import crypto from "crypto";

// Generate QR code for ticket
const generateQRCode = (ticketId, vehicleId, routeId) => {
  const data = `${ticketId}-${vehicleId}-${routeId}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32).toUpperCase();
};

// Get all passengers with tickets (for admin)
export const getAllPassengersWithTickets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        u.user_id,
        COALESCE(t.passenger_name, u.full_name) AS passenger_name,
        COALESCE(t.passenger_phone, u.phone) AS passenger_phone,
        COALESCE(t.passenger_email, u.email) AS passenger_email,
        COUNT(t.ticket_id) AS total_tickets,
        SUM(t.amount_paid) AS total_spent,
        MAX(t.created_at) AS last_booking_date
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      GROUP BY t.passenger_id, u.user_id, t.passenger_name, u.full_name, t.passenger_phone, u.phone, t.passenger_email, u.email
      ORDER BY last_booking_date DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching passengers:", err);
    res.status(500).json({ error: "Failed to fetch passengers", details: err.message });
  }
};

// Get all driver-vehicle-route assignments (for admin)
export const getDriverAssignments = async (req, res) => {
  try {
    // Check if expected_start_time column exists
    let hasExpectedStartTime = false;
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='routes' AND column_name='expected_start_time'
      `);
      hasExpectedStartTime = columnCheck.rows.length > 0;
    } catch (checkErr) {
      console.log('Could not check for expected_start_time column:', checkErr.message);
    }

    // First get driver-vehicle-route assignments without passenger count
    let assignmentsResult;
    if (hasExpectedStartTime) {
      assignmentsResult = await pool.query(`
        SELECT DISTINCT
          d.driver_id,
          u.full_name AS driver_name,
          u.email AS driver_email,
          u.phone AS driver_phone,
          d.license_number,
          d.status AS driver_status,
          COALESCE(v.vehicle_id, 0) AS vehicle_id,
          v.plate_number,
          v.model AS vehicle_model,
          v.capacity,
          v.status AS vehicle_status,
          COALESCE(
            CASE 
              WHEN d.assigned_line_id IS NOT NULL THEN r.route_id
              WHEN v.assigned_route IS NOT NULL THEN r2.route_id
              ELSE NULL
            END, 
            0
          ) AS route_id,
          COALESCE(r.route_name, r2.route_name) AS route_name,
          COALESCE(r.start_location, r2.start_location) AS start_location,
          COALESCE(r.end_location, r2.end_location) AS end_location,
          COALESCE(r.fare_base, r2.fare_base) AS fare_base,
          COALESCE(r.expected_start_time, r2.expected_start_time) AS expected_start_time
        FROM drivers d
        JOIN users u ON d.user_id = u.user_id
        LEFT JOIN vehicles v ON v.assigned_driver = d.driver_id
        LEFT JOIN routes r ON d.assigned_line_id = r.route_id
        LEFT JOIN routes r2 ON v.assigned_route = r2.route_id AND (r.route_id IS NULL OR r.route_id = r2.route_id)
        ORDER BY d.driver_id ASC, COALESCE(v.vehicle_id, 0) ASC
      `);
    } else {
      assignmentsResult = await pool.query(`
        SELECT DISTINCT
          d.driver_id,
          u.full_name AS driver_name,
          u.email AS driver_email,
          u.phone AS driver_phone,
          d.license_number,
          d.status AS driver_status,
          COALESCE(v.vehicle_id, 0) AS vehicle_id,
          v.plate_number,
          v.model AS vehicle_model,
          v.capacity,
          v.status AS vehicle_status,
          COALESCE(
            CASE 
              WHEN d.assigned_line_id IS NOT NULL THEN r.route_id
              WHEN v.assigned_route IS NOT NULL THEN r2.route_id
              ELSE NULL
            END, 
            0
          ) AS route_id,
          COALESCE(r.route_name, r2.route_name) AS route_name,
          COALESCE(r.start_location, r2.start_location) AS start_location,
          COALESCE(r.end_location, r2.end_location) AS end_location,
          COALESCE(r.fare_base, r2.fare_base) AS fare_base,
          NULL::timestamp AS expected_start_time
        FROM drivers d
        JOIN users u ON d.user_id = u.user_id
        LEFT JOIN vehicles v ON v.assigned_driver = d.driver_id
        LEFT JOIN routes r ON d.assigned_line_id = r.route_id
        LEFT JOIN routes r2 ON v.assigned_route = r2.route_id AND (r.route_id IS NULL OR r.route_id = r2.route_id)
        ORDER BY d.driver_id ASC, COALESCE(v.vehicle_id, 0) ASC
      `);
    }

    // Get passenger counts for each vehicle
    const passengerCountsResult = await pool.query(`
      SELECT 
        vehicle_id,
        COUNT(DISTINCT ticket_id) AS total_passengers
      FROM tickets
      WHERE payment_status = 'completed'
        AND vehicle_id IS NOT NULL
      GROUP BY vehicle_id
    `);

    // Create a map of vehicle_id to passenger count
    const passengerCountMap = {};
    passengerCountsResult.rows.forEach(row => {
      passengerCountMap[row.vehicle_id] = parseInt(row.total_passengers) || 0;
    });

    // Combine assignments with passenger counts
    const assignments = assignmentsResult.rows.map(assignment => ({
      ...assignment,
      total_passengers: passengerCountMap[assignment.vehicle_id] || 0
    }));

    res.status(200).json(assignments);
  } catch (err) {
    console.error("Error fetching driver assignments:", err);
    res.status(500).json({ error: "Failed to fetch driver assignments", details: err.message });
  }
};

// Helper function to get driver_id from user_id
const getDriverIdFromUserId = async (userId) => {
  const result = await pool.query(
    `SELECT driver_id FROM drivers WHERE user_id = $1`,
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].driver_id : null;
};

// Get passengers for driver's vehicle
export const getVehiclePassengers = async (req, res) => {
  try {
    const driverId = req.params.driverId || (req.user ? await getDriverIdFromUserId(req.user.user_id) : null);
    
    if (!driverId) {
      return res.status(400).json({ error: "Driver ID required" });
    }

    // Get driver's vehicle
    const vehicleResult = await pool.query(`
      SELECT vehicle_id, plate_number, assigned_route
      FROM vehicles
      WHERE assigned_driver = $1
      LIMIT 1
    `, [driverId]);

    if (!vehicleResult.rows.length) {
      return res.status(404).json({ error: "No vehicle assigned to this driver" });
    }

    const vehicle = vehicleResult.rows[0];

    // Get passengers with tickets for this vehicle
    const passengersResult = await pool.query(`
      SELECT 
        t.ticket_id,
        t.qr_code,
        t.passenger_name,
        t.passenger_phone,
        t.passenger_email,
        t.seat_number,
        t.travel_date,
        t.payment_status,
        t.boarding_status,
        t.journey_status,
        t.boarding_confirmed_at,
        t.actual_start_location,
        t.actual_end_location,
        r.route_name,
        r.start_location,
        r.end_location,
        r.expected_start_time,
        u.user_id,
        u.full_name AS buyer_name
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
        AND (t.travel_date IS NULL OR t.travel_date::date = CURRENT_DATE)
      ORDER BY t.created_at ASC
    `, [vehicle.vehicle_id]);

    res.status(200).json({
      vehicle: vehicle,
      passengers: passengersResult.rows
    });
  } catch (err) {
    console.error("Error fetching vehicle passengers:", err);
    res.status(500).json({ error: "Failed to fetch passengers", details: err.message });
  }
};

// Scan and verify ticket QR code (for driver's vehicle only)
export const scanTicket = async (req, res) => {
  try {
    const { qr_code, vehicle_id } = req.body;

    if (!qr_code || !vehicle_id) {
      return res.status(400).json({ error: "QR code and vehicle ID are required" });
    }

    // Verify the vehicle belongs to the logged-in driver
    let driverId = null;
    if (req.user) {
      driverId = await getDriverIdFromUserId(req.user.user_id);
      if (driverId) {
        const vehicleCheck = await pool.query(`
          SELECT vehicle_id FROM vehicles 
          WHERE vehicle_id = $1 AND assigned_driver = $2
        `, [vehicle_id, driverId]);
        
        if (!vehicleCheck.rows.length) {
          return res.status(403).json({ error: "You are not assigned to this vehicle" });
        }
      }
    }

    // Find ticket by QR code
    const ticketResult = await pool.query(`
      SELECT 
        t.*,
        r.route_name,
        r.start_location,
        r.end_location,
        t.actual_start_location,
        t.actual_end_location,
        v.plate_number,
        v.vehicle_id AS ticket_vehicle_id
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.qr_code = $1 AND t.payment_status = 'completed'
    `, [qr_code]);

    if (!ticketResult.rows.length) {
      return res.status(404).json({ error: "Invalid or unpaid ticket" });
    }

    const ticket = ticketResult.rows[0];

    // Verify ticket is for this vehicle
    if (ticket.vehicle_id !== parseInt(vehicle_id)) {
      return res.status(400).json({ 
        error: "Ticket not valid for this vehicle",
        ticket_vehicle: ticket.plate_number || ticket.ticket_vehicle_id
      });
    }

    res.status(200).json({
      valid: true,
      ticket: {
        ticket_id: ticket.ticket_id,
        passenger_name: ticket.passenger_name,
        passenger_phone: ticket.passenger_phone,
        seat_number: ticket.seat_number,
        route_name: ticket.route_name,
        boarding_status: ticket.boarding_status || "pending"
      }
    });
  } catch (err) {
    console.error("Error scanning ticket:", err);
    res.status(500).json({ error: "Failed to scan ticket", details: err.message });
  }
};

// Confirm passenger boarding
export const confirmBoarding = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({ error: "Ticket ID is required" });
    }

    // Update ticket boarding status
    const updateResult = await pool.query(`
      UPDATE tickets 
      SET boarding_status = $1,
          boarding_confirmed_at = CURRENT_TIMESTAMP,
          journey_status = $2
      WHERE ticket_id = $3
      RETURNING *
    `, ["confirmed", "in_progress", ticket_id]);

    if (!updateResult.rows.length) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = updateResult.rows[0];

    // Get ticket details for notification
    const ticketDetails = await pool.query(`
      SELECT 
        t.*,
        r.route_name,
        v.plate_number,
        r.expected_start_time
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.ticket_id = $1
    `, [ticket_id]);

    const ticketData = ticketDetails.rows[0];

    // Create notification for passenger
    let notificationUserId = ticket.passenger_id;
    
    // Find user by phone or email if passenger_id doesn't match
    if (ticket.passenger_phone) {
      const phoneUser = await pool.query(
        `SELECT user_id FROM users WHERE phone = $1 LIMIT 1`,
        [ticket.passenger_phone]
      );
      if (phoneUser.rows.length > 0) {
        notificationUserId = phoneUser.rows[0].user_id;
      }
    }

    if (ticket.passenger_email && !notificationUserId) {
      const emailUser = await pool.query(
        `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
        [ticket.passenger_email]
      );
      if (emailUser.rows.length > 0) {
        notificationUserId = emailUser.rows[0].user_id;
      }
    }

    if (notificationUserId) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, title)
         VALUES ($1, $2, $3)`,
        [
          notificationUserId,
          `Your journey on ${ticketData.route_name} has started! Vehicle: ${ticketData.plate_number || 'N/A'}`,
          "Journey Started"
        ]
      );
    }

    res.status(200).json({
      message: "Passenger boarding confirmed",
      ticket: ticket
    });
  } catch (err) {
    console.error("Error confirming boarding:", err);
    res.status(500).json({ error: "Failed to confirm boarding", details: err.message });
  }
};

// Update journey location
export const updateLocation = async (req, res) => {
  try {
    const { vehicle_id, current_location, latitude, longitude, estimated_arrival } = req.body;
    const driverId = req.user ? await getDriverIdFromUserId(req.user.user_id) : null;

    if (!vehicle_id || !current_location) {
      return res.status(400).json({ error: "Vehicle ID and current location are required" });
    }

    // Verify driver owns this vehicle
    if (driverId) {
      const vehicleCheck = await pool.query(
        `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND assigned_driver = $2`,
        [vehicle_id, driverId]
      );

      if (!vehicleCheck.rows.length) {
        return res.status(403).json({ error: "You are not assigned to this vehicle" });
      }
    }

    // Get all passengers for this vehicle
    const passengersResult = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        t.passenger_phone,
        t.passenger_email,
        u.user_id
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
        AND t.journey_status = 'in_progress'
    `, [vehicle_id]);

    // Create notification for all passengers
    const notificationPromises = passengersResult.rows.map(async (passenger) => {
      let targetUserId = passenger.user_id || passenger.passenger_id;
      
      // Find user by phone if user_id not available
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
            `Location update: Currently at ${current_location}. ${estimated_arrival ? `ETA: ${estimated_arrival}` : ''}`,
            "Journey Update"
          ]
        ).catch(() => null); // Ignore errors for users not found
      }
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);

    // Store location update (you might want a vehicle_tracking table)
    const timestamp = new Date().toISOString();

    res.status(200).json({
      message: "Location updated successfully",
      location: current_location,
      timestamp: timestamp,
      notified_passengers: passengersResult.rows.length
    });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ error: "Failed to update location", details: err.message });
  }
};

// Start journey
export const startJourney = async (req, res) => {
  try {
    const { vehicle_id } = req.body;
    const driverId = req.user ? await getDriverIdFromUserId(req.user.user_id) : null;

    if (!vehicle_id) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    if (driverId) {
      const vehicleCheck = await pool.query(
        `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1 AND assigned_driver = $2`,
        [vehicle_id, driverId]
      );

      if (!vehicleCheck.rows.length) {
        return res.status(403).json({ error: "You are not assigned to this vehicle" });
      }
    }

    // Update all tickets for this vehicle to in_progress
    const updateResult = await pool.query(`
      UPDATE tickets
      SET journey_status = 'in_progress',
          boarding_confirmed_at = CURRENT_TIMESTAMP
      WHERE vehicle_id = $1 
        AND payment_status = 'completed'
        AND (journey_status IS NULL OR journey_status = 'pending')
      RETURNING ticket_id
    `, [vehicle_id]);

    // Notify all passengers
    const passengersResult = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        t.passenger_phone,
        t.passenger_email,
        u.user_id,
        r.route_name,
        v.plate_number
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
    `, [vehicle_id]);

    const notificationPromises = passengersResult.rows.map(passenger => {
      const userId = passenger.user_id || passenger.passenger_id;
      
      return pool.query(
        `INSERT INTO notifications (user_id, message, title)
         VALUES ($1, $2, $3)`,
        [
          userId,
          `Your journey on ${passenger.route_name} has started! Vehicle: ${passenger.plate_number || 'N/A'}`,
          "Journey Started"
        ]
      ).catch(() => null);
    });

    await Promise.all(notificationPromises);

    res.status(200).json({
      message: "Journey started successfully",
      tickets_updated: updateResult.rows.length,
      passengers_notified: passengersResult.rows.length
    });
  } catch (err) {
    console.error("Error starting journey:", err);
    res.status(500).json({ error: "Failed to start journey", details: err.message });
  }
};

// Add QR code to existing tickets (migration helper)
export const addQRCodeToTicket = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    
    const ticketResult = await pool.query(
      `SELECT ticket_id, vehicle_id, route_id FROM tickets WHERE ticket_id = $1`,
      [ticket_id]
    );

    if (!ticketResult.rows.length) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];
    const qr_code = generateQRCode(ticket.ticket_id, ticket.vehicle_id || 0, ticket.route_id);

    await pool.query(
      `UPDATE tickets SET qr_code = $1 WHERE ticket_id = $2`,
      [qr_code, ticket_id]
    );

    res.status(200).json({
      message: "QR code generated",
      ticket_id: ticket_id,
      qr_code: qr_code
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    res.status(500).json({ error: "Failed to generate QR code", details: err.message });
  }
};

