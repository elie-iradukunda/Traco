import { pool } from "../db.js";

const getDriverIdFromUserId = async (userId) => {
  const result = await pool.query(
    `SELECT driver_id FROM drivers WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].driver_id : null;
};

// Get all passengers with tickets (for admin)
export const getAllPassengersWithTickets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        COALESCE(t.passenger_name, u.full_name) AS passenger_name,
        COALESCE(t.passenger_phone, u.phone) AS passenger_phone,
        COALESCE(t.passenger_email, u.email) AS passenger_email,
        COUNT(t.ticket_id) AS total_tickets,
        SUM(CASE WHEN t.payment_status = 'completed' THEN 1 ELSE 0 END) AS completed_tickets,
        SUM(t.amount_paid) AS total_spent
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      GROUP BY t.passenger_id, t.passenger_name, u.full_name, t.passenger_phone, u.phone, t.passenger_email, u.email
      ORDER BY total_tickets DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching passengers:", err);
    res.status(500).json({ error: "Database error", details: err.message });
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
      passenger_count: passengerCountMap[assignment.vehicle_id] || 0
    }));

    res.json(assignments);
  } catch (err) {
    console.error("Error fetching driver assignments:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

// Get passengers for driver's vehicle
export const getVehiclePassengers = async (req, res) => {
  try {
    let driverId = req.params.driverId;
    
    // If no driverId in params, try to get from user token
    if (!driverId && req.user) {
      driverId = await getDriverIdFromUserId(req.user.user_id);
    }
    
    // If still no driverId, check if driverId param might be a user_id
    if (!driverId && req.params.driverId) {
      const driverCheck = await pool.query(
        `SELECT driver_id FROM drivers WHERE user_id = $1 OR driver_id = $1 LIMIT 1`,
        [req.params.driverId]
      );
      if (driverCheck.rows.length > 0) {
        driverId = driverCheck.rows[0].driver_id;
      }
    }
    
    if (!driverId) {
      return res.status(400).json({ error: "Driver ID required. Please ensure you are logged in as a driver." });
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

    // Check which columns exist in tickets table
    const ticketColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    const ticketColumns = ticketColumnCheck.rows.map(row => row.column_name);
    const hasQRCode = ticketColumns.includes('qr_code');
    const hasPassengerName = ticketColumns.includes('passenger_name');
    const hasPassengerPhone = ticketColumns.includes('passenger_phone');
    const hasPassengerEmail = ticketColumns.includes('passenger_email');
    const hasBoardingStatus = ticketColumns.includes('boarding_status');
    const hasJourneyStatus = ticketColumns.includes('journey_status');
    const hasBoardingConfirmedAt = ticketColumns.includes('boarding_confirmed_at');
    const hasActualStartLocation = ticketColumns.includes('actual_start_location');
    const hasActualEndLocation = ticketColumns.includes('actual_end_location');

    // Check which columns exist in routes table
    const routeColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'routes'
    `);
    const routeColumns = routeColumnCheck.rows.map(row => row.column_name);
    const hasExpectedStartTime = routeColumns.includes('expected_start_time');

    // Build SELECT clause dynamically
    const passengerSelectFields = [
      't.ticket_id',
      hasQRCode ? 't.qr_code' : 'NULL AS qr_code',
      hasPassengerName ? 't.passenger_name' : 'NULL AS passenger_name',
      hasPassengerPhone ? 't.passenger_phone' : 'NULL AS passenger_phone',
      hasPassengerEmail ? 't.passenger_email' : 'NULL AS passenger_email',
      't.seat_number',
      't.travel_date',
      't.payment_status',
      hasBoardingStatus ? 't.boarding_status' : "NULL AS boarding_status",
      hasJourneyStatus ? 't.journey_status' : 'NULL AS journey_status',
      hasBoardingConfirmedAt ? 't.boarding_confirmed_at' : 'NULL AS boarding_confirmed_at',
      hasActualStartLocation ? 't.actual_start_location' : 'NULL AS actual_start_location',
      hasActualEndLocation ? 't.actual_end_location' : 'NULL AS actual_end_location',
      'r.route_name',
      'r.start_location',
      'r.end_location',
      hasExpectedStartTime ? 'r.expected_start_time' : 'NULL AS expected_start_time',
      'u.user_id',
      'u.full_name AS buyer_name'
    ];

    // Get passengers with tickets for this vehicle (all completed tickets, not just today)
    const passengersResult = await pool.query(`
      SELECT 
        ${passengerSelectFields.join(',\n        ')}
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
      ORDER BY t.created_at ASC
    `, [vehicle.vehicle_id]);

    // Check if journey is already started (check if any ticket has journey_status = 'in_progress')
    let isJourneyInProgress = false;
    if (hasJourneyStatus) {
      const journeyCheck = await pool.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE vehicle_id = $1 
          AND payment_status = 'completed'
          AND journey_status = 'in_progress'
        LIMIT 1
      `, [vehicle.vehicle_id]);
      
      isJourneyInProgress = parseInt(journeyCheck.rows[0]?.count || 0) > 0;
    }

    res.status(200).json({
      vehicle: vehicle,
      passengers: passengersResult.rows,
      journey_in_progress: isJourneyInProgress
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

    // Check which columns exist in tickets table
    const ticketColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    const ticketColumns = ticketColumnCheck.rows.map(row => row.column_name);
    const hasQRCode = ticketColumns.includes('qr_code');
    const hasPassengerName = ticketColumns.includes('passenger_name');
    const hasPassengerPhone = ticketColumns.includes('passenger_phone');
    const hasPassengerEmail = ticketColumns.includes('passenger_email');
    const hasBoardingStatus = ticketColumns.includes('boarding_status');
    const hasJourneyStatus = ticketColumns.includes('journey_status');
    const hasActualStartLocation = ticketColumns.includes('actual_start_location');
    const hasActualEndLocation = ticketColumns.includes('actual_end_location');

    // Build WHERE clause - check if qr_code column exists
    let whereClause = "WHERE t.payment_status = 'completed'";
    if (!hasQRCode) {
      return res.status(400).json({ error: "QR code feature not available - database migration required" });
    }
    whereClause += " AND t.qr_code = $1";

    // Build SELECT clause dynamically
    const ticketSelectFields = [
      't.ticket_id',
      't.passenger_id',
      't.route_id',
      't.vehicle_id',
      't.seat_number',
      't.travel_date',
      't.payment_status',
      't.amount_paid',
      't.created_at',
      hasQRCode ? 't.qr_code' : 'NULL AS qr_code',
      hasPassengerName ? 't.passenger_name' : 'NULL AS passenger_name',
      hasPassengerPhone ? 't.passenger_phone' : 'NULL AS passenger_phone',
      hasPassengerEmail ? 't.passenger_email' : 'NULL AS passenger_email',
      hasBoardingStatus ? 't.boarding_status' : "NULL AS boarding_status",
      hasJourneyStatus ? 't.journey_status' : 'NULL AS journey_status',
      hasActualStartLocation ? 't.actual_start_location' : 'NULL AS actual_start_location',
      hasActualEndLocation ? 't.actual_end_location' : 'NULL AS actual_end_location',
      'r.route_name',
      'r.start_location',
      'r.end_location',
      'v.plate_number',
      'v.vehicle_id AS ticket_vehicle_id'
    ];

    // Find ticket by QR code
    const ticketResult = await pool.query(`
      SELECT 
        ${ticketSelectFields.join(',\n        ')}
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      ${whereClause}
    `, [qr_code]);

    if (!ticketResult.rows.length) {
      return res.status(404).json({ error: "Invalid or unpaid ticket" });
    }

    const ticket = ticketResult.rows[0];

    // Verify ticket is for this vehicle
    if (ticket.vehicle_id != vehicle_id) {
      return res.status(403).json({ error: "This ticket is not for your vehicle" });
    }

    res.status(200).json({
      valid: true,
      ticket: ticket
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

    // Check which columns exist in tickets table
    const ticketColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    const ticketColumns = ticketColumnCheck.rows.map(row => row.column_name);
    const hasBoardingStatus = ticketColumns.includes('boarding_status');
    const hasJourneyStatus = ticketColumns.includes('journey_status');
    const hasBoardingConfirmedAt = ticketColumns.includes('boarding_confirmed_at');

    // Build UPDATE clause dynamically
    const updateFields = [];
    if (hasBoardingStatus) {
      updateFields.push("boarding_status = 'confirmed'");
    }
    if (hasBoardingConfirmedAt) {
      updateFields.push("boarding_confirmed_at = CURRENT_TIMESTAMP");
    }
    if (hasJourneyStatus) {
      updateFields.push("journey_status = 'in_progress'");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Boarding status tracking not available - migration required" });
    }

    // Update ticket boarding status
    const updateResult = await pool.query(`
      UPDATE tickets 
      SET ${updateFields.join(',\n          ')}
      WHERE ticket_id = $1
      RETURNING *
    `, [ticket_id]);

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

    // Get ALL passengers for this vehicle (not just in_progress) - notify everyone with tickets
    // Include all passenger identification fields
    const passengersResult = await pool.query(`
      SELECT DISTINCT
        t.passenger_id,
        COALESCE(t.passenger_phone, u.phone) AS passenger_phone,
        COALESCE(t.passenger_email, u.email) AS passenger_email,
        u.user_id,
        u.phone AS user_phone,
        u.email AS user_email
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.vehicle_id = $1 
        AND t.payment_status = 'completed'
    `, [vehicle_id]);

    // Create notification for all passengers
    const notificationPromises = passengersResult.rows.map(async (passenger) => {
      let targetUserId = passenger.user_id || passenger.passenger_id;
      
      // If no user_id, try to find user by phone
      if (!targetUserId && passenger.passenger_phone) {
        const phoneUser = await pool.query(
          `SELECT user_id FROM users WHERE phone = $1 LIMIT 1`,
          [passenger.passenger_phone]
        ).catch(() => ({ rows: [] }));
        if (phoneUser.rows.length > 0) {
          targetUserId = phoneUser.rows[0].user_id;
        }
      }
      
      // If still no user_id, try to find user by email
      if (!targetUserId && passenger.passenger_email) {
        const emailUser = await pool.query(
          `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
          [passenger.passenger_email]
        ).catch(() => ({ rows: [] }));
        if (emailUser.rows.length > 0) {
          targetUserId = emailUser.rows[0].user_id;
        }
      }

      // Send notification if we found a user
      if (targetUserId) {
        return pool.query(
          `INSERT INTO notifications (user_id, message, title)
           VALUES ($1, $2, $3)`,
          [
            targetUserId,
            `Location update: Currently at ${current_location}. ${estimated_arrival ? `ETA: ${estimated_arrival}` : ''}`,
            "Journey Update"
          ]
        ).catch((err) => {
          console.error(`Failed to notify user ${targetUserId}:`, err.message);
          return null; // Ignore errors for individual users
        });
      }
      
      // Log if we couldn't find a user for this passenger
      if (!targetUserId) {
        console.log(`Could not find user for passenger: phone=${passenger.passenger_phone}, email=${passenger.passenger_email}`);
      }
      
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);
    
    // Log how many passengers were notified
    const notifiedCount = passengersResult.rows.filter(p => p.user_id || p.passenger_id).length;
    console.log(`Location update: Notified ${notifiedCount} passengers out of ${passengersResult.rows.length} total`);

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

    // Check which columns exist in tickets table
    const ticketColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    const ticketColumns = ticketColumnCheck.rows.map(row => row.column_name);
    const hasJourneyStatus = ticketColumns.includes('journey_status');
    const hasBoardingConfirmedAt = ticketColumns.includes('boarding_confirmed_at');
    const hasBoardingStatus = ticketColumns.includes('boarding_status');

    // Build UPDATE clause dynamically
    const updateFields = [];
    if (hasJourneyStatus) {
      updateFields.push("journey_status = 'in_progress'");
    }
    if (hasBoardingConfirmedAt) {
      updateFields.push("boarding_confirmed_at = CURRENT_TIMESTAMP");
    }
    if (hasBoardingStatus) {
      updateFields.push("boarding_status = 'confirmed'");
    }

    if (updateFields.length === 0) {
      // No updatable columns exist - just verify tickets exist
      const ticketCheck = await pool.query(`
        SELECT ticket_id
        FROM tickets
        WHERE vehicle_id = $1 
          AND payment_status = 'completed'
        LIMIT 1
      `, [vehicle_id]);
      
      if (!ticketCheck.rows.length) {
        return res.status(404).json({ error: "No tickets found for this vehicle" });
      }
      
      // Return success even though we can't update (columns don't exist)
      return res.status(200).json({ 
        message: "Journey started (note: status tracking columns not available - migration required)",
        tickets_updated: ticketCheck.rows.length
      });
    }

    // Build WHERE clause
    let whereClause = "WHERE vehicle_id = $1 AND payment_status = 'completed'";
    if (hasJourneyStatus) {
      whereClause += " AND (journey_status IS NULL OR journey_status = 'pending')";
    }

    // Update all tickets for this vehicle to in_progress
    const updateResult = await pool.query(`
      UPDATE tickets
      SET ${updateFields.join(', ')}
      ${whereClause}
      RETURNING ticket_id
    `, [vehicle_id]);

    // Check which passenger columns exist (already checked above, reuse the variables)
    const hasPassengerPhoneForNotify = ticketColumns.includes('passenger_phone');
    const hasPassengerEmailForNotify = ticketColumns.includes('passenger_email');

    // Build SELECT clause for passenger notification
    const passengerNotifyFields = [
      't.passenger_id',
      hasPassengerPhoneForNotify ? 't.passenger_phone' : 'u.phone AS passenger_phone',
      hasPassengerEmailForNotify ? 't.passenger_email' : 'u.email AS passenger_email',
      'u.user_id',
      'r.route_name',
      'v.plate_number'
    ];

    // Notify all passengers
    const passengersResult = await pool.query(`
      SELECT DISTINCT
        ${passengerNotifyFields.join(',\n        ')}
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

// Stop/End journey
export const stopJourney = async (req, res) => {
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

    // Check which columns exist in tickets table
    const ticketColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    const ticketColumns = ticketColumnCheck.rows.map(row => row.column_name);
    const hasJourneyStatus = ticketColumns.includes('journey_status');

    // Update all tickets for this vehicle to completed
    let updateResult;
    if (hasJourneyStatus) {
      updateResult = await pool.query(`
        UPDATE tickets
        SET journey_status = 'completed'
        WHERE vehicle_id = $1 
          AND payment_status = 'completed'
          AND journey_status = 'in_progress'
        RETURNING ticket_id
      `, [vehicle_id]);
    } else {
      // If journey_status doesn't exist, just verify tickets exist
      const ticketCheck = await pool.query(`
        SELECT ticket_id
        FROM tickets
        WHERE vehicle_id = $1 
          AND payment_status = 'completed'
        LIMIT 1
      `, [vehicle_id]);
      
      updateResult = { rows: ticketCheck.rows };
    }

    // Get passenger notification fields
    const hasPassengerPhoneForNotify = ticketColumns.includes('passenger_phone');
    const hasPassengerEmailForNotify = ticketColumns.includes('passenger_email');

    const passengerNotifyFields = [
      't.passenger_id',
      hasPassengerPhoneForNotify ? 't.passenger_phone' : 'u.phone AS passenger_phone',
      hasPassengerEmailForNotify ? 't.passenger_email' : 'u.email AS passenger_email',
      'u.user_id',
      'r.route_name',
      'v.plate_number'
    ];

    // Notify all passengers that journey has ended
    const passengersResult = await pool.query(`
      SELECT DISTINCT
        ${passengerNotifyFields.join(',\n        ')}
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
          `Your journey on ${passenger.route_name} has ended. Thank you for traveling with us! Vehicle: ${passenger.plate_number || 'N/A'}`,
          "Journey Completed"
        ]
      ).catch(() => null);
    });

    await Promise.all(notificationPromises);

    res.status(200).json({
      message: "Journey stopped successfully",
      tickets_updated: updateResult.rows.length,
      passengers_notified: passengersResult.rows.length
    });
  } catch (err) {
    console.error("Error stopping journey:", err);
    res.status(500).json({ error: "Failed to stop journey", details: err.message });
  }
};
