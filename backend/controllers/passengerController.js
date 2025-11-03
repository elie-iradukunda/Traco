import { pool } from "../db.js";

// Browse all routes (public or passenger)
export const getAllRoutes = async (req, res) => {
  try {
    // Get routes with vehicles - check multiple ways vehicles can be assigned to routes
    const result = await pool.query(`
      SELECT DISTINCT
        r.route_id,
        r.route_name,
        r.start_location,
        r.end_location,
        r.distance_km,
        r.fare_base,
        r.map_url,
        r.company_id,
        r.expected_start_time,
        r.assigned_vehicle AS route_assigned_vehicle,
        c.company_name,
        v.plate_number AS assigned_vehicle_plate,
        v.vehicle_id,
        v.status AS vehicle_status,
        v.assigned_route,
        v.assigned_driver,
        d.driver_id,
        d.assigned_line_id AS driver_assigned_route,
        u.full_name AS driver_name,
        CASE 
          WHEN v.vehicle_id IS NOT NULL THEN true
          WHEN r.assigned_vehicle IS NOT NULL THEN true
          WHEN EXISTS (
            SELECT 1 FROM vehicles v2
            JOIN drivers d2 ON v2.assigned_driver = d2.driver_id
            WHERE d2.assigned_line_id = r.route_id AND v2.status = 'active'
          ) THEN true
          ELSE false
        END AS has_vehicle
      FROM routes r
      LEFT JOIN companies c ON r.company_id = c.company_id
      -- Check if route has vehicle assigned directly
      LEFT JOIN vehicles v ON (
        r.assigned_vehicle = v.vehicle_id 
        OR v.assigned_route = r.route_id
        OR (
          -- Check if a vehicle's driver is assigned to this route
          v.assigned_driver IN (
            SELECT driver_id FROM drivers WHERE assigned_line_id = r.route_id
          )
        )
      ) AND v.status = 'active'
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      ORDER BY r.route_id ASC
    `);
    
    // Deduplicate routes and ensure has_vehicle is true if any vehicle is found
    const routeMap = new Map();
    
    for (const route of result.rows) {
      const routeId = route.route_id;
      if (!routeMap.has(routeId)) {
        routeMap.set(routeId, {
          ...route,
          has_vehicle: route.has_vehicle || false
        });
      } else {
        // If we find a vehicle for this route in any row, mark has_vehicle as true
        const existing = routeMap.get(routeId);
        if (route.vehicle_id || route.has_vehicle) {
          existing.has_vehicle = true;
          if (route.vehicle_id && !existing.vehicle_id) {
            existing.vehicle_id = route.vehicle_id;
            existing.assigned_vehicle_plate = route.assigned_vehicle_plate;
            existing.driver_name = route.driver_name;
          }
        }
      }
    }
    
    const uniqueRoutes = Array.from(routeMap.values());
    
    // Get stops count for each route
    const routesWithStops = await Promise.all(uniqueRoutes.map(async (route) => {
      try {
        const stopsResult = await pool.query(`
          SELECT COUNT(*) as stops_count
          FROM route_stops
          WHERE route_id = $1
        `, [route.route_id]);
        
        return {
          ...route,
          stops_count: parseInt(stopsResult.rows[0]?.stops_count || 0)
        };
      } catch (err) {
        return { ...route, stops_count: 0 };
      }
    }));
    
    res.json(routesWithStops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

// Get available vehicles for a route
export const getVehiclesForRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.vehicle_id,
        v.plate_number,
        v.model,
        v.capacity,
        v.status,
        v.assigned_driver,
        u.full_name AS driver_name,
        d.driver_id
      FROM vehicles v
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN routes r ON v.assigned_route = r.route_id OR r.assigned_vehicle = v.vehicle_id
      WHERE (r.route_id = $1 OR v.assigned_route = $1 OR r.assigned_vehicle = v.vehicle_id)
        AND v.status = 'active'
      GROUP BY v.vehicle_id, v.plate_number, v.model, v.capacity, v.status, v.assigned_driver, u.full_name, d.driver_id
      ORDER BY v.vehicle_id ASC
    `, [routeId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vehicles for route:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

// Get tickets for a passenger (including tickets bought for others using their phone/email)
export const getPassengerTickets = async (req, res) => {
  const passengerId = req.params.passengerId;
  try {
    // Get user's phone and email
    const userInfo = await pool.query(
      `SELECT phone, email FROM users WHERE user_id = $1`,
      [passengerId]
    );

    if (!userInfo.rows.length) {
      return res.status(404).json({ error: "Passenger not found" });
    }

    const userPhone = userInfo.rows[0].phone;
    const userEmail = userInfo.rows[0].email;

    // Check which columns exist in tickets table
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasPassengerName = existingColumns.includes('passenger_name');
    const hasPassengerPhone = existingColumns.includes('passenger_phone');
    const hasPassengerEmail = existingColumns.includes('passenger_email');
    const hasPaymentMethod = existingColumns.includes('payment_method');
    const hasQRCode = existingColumns.includes('qr_code');
    const hasBoardingStatus = existingColumns.includes('boarding_status');
    const hasJourneyStatus = existingColumns.includes('journey_status');
    const hasActualStart = existingColumns.includes('actual_start_location');
    const hasActualEnd = existingColumns.includes('actual_end_location');
    const hasCalculatedFare = existingColumns.includes('calculated_fare');

    // Build SELECT clause dynamically
    const selectFields = [
      't.ticket_id',
      't.passenger_id',
      't.route_id',
      't.vehicle_id',
      't.seat_number',
      't.travel_date',
      't.created_at',
      hasPassengerName ? 't.passenger_name' : 'NULL AS passenger_name',
      hasPassengerPhone ? 't.passenger_phone' : 'NULL AS passenger_phone',
      hasPassengerEmail ? 't.passenger_email' : 'NULL AS passenger_email',
      't.payment_status',
      hasPaymentMethod ? 't.payment_method' : 'NULL AS payment_method',
      't.amount_paid',
      hasQRCode ? 't.qr_code' : 'NULL AS qr_code',
      hasBoardingStatus ? 't.boarding_status' : "NULL AS boarding_status",
      hasJourneyStatus ? 't.journey_status' : 'NULL AS journey_status',
      hasActualStart ? 't.actual_start_location' : 'NULL AS actual_start_location',
      hasActualEnd ? 't.actual_end_location' : 'NULL AS actual_end_location',
      hasCalculatedFare ? 't.calculated_fare' : 't.amount_paid AS calculated_fare',
      'r.route_name',
      'r.start_location',
      'r.end_location',
      'r.fare_base',
      'r.map_url',
      'r.expected_start_time',
      'v.plate_number',
      'v.model AS vehicle_model'
    ];

    // Build WHERE clause - check if passenger_phone/email columns exist
    let whereClause = 'WHERE t.passenger_id = $1';
    const whereParams = [passengerId];
    let paramCount = 2;
    
    if (hasPassengerPhone && userPhone) {
      whereClause += ` OR (t.passenger_phone = $${paramCount} AND t.passenger_phone IS NOT NULL)`;
      whereParams.push(userPhone);
      paramCount++;
    }
    
    if (hasPassengerEmail && userEmail) {
      whereClause += ` OR (t.passenger_email = $${paramCount} AND t.passenger_email IS NOT NULL AND $${paramCount} IS NOT NULL)`;
      whereParams.push(userEmail);
      paramCount++;
    }

    // Get tickets where passenger_id matches OR passenger_phone/email matches (for tickets bought for others)
    const result = await pool.query(`
      SELECT 
        ${selectFields.join(',\n        ')}
      FROM tickets t
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      ${whereClause}
      ORDER BY t.created_at DESC
    `, whereParams);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

// Book a ticket with passenger details (can be for someone else)
export const bookTicket = async (req, res) => {
  try {
    const { 
      passenger_id,      // User ID of person buying (logged in user)
      route_id, 
      vehicle_id,
      start_stop_id,     // Start stop ID (sub-route)
      end_stop_id,       // End stop ID (sub-route)
      actual_start_location,  // Actual start location name
      actual_end_location,     // Actual end location name
      passenger_name,    // Name of person traveling
      passenger_phone,  // Phone of person traveling
      passenger_email,   // Email of person traveling (optional)
      travel_date,
      seat_number,
      amount_paid,
      payment_method
    } = req.body;

    if (!passenger_id || !route_id || !passenger_name || !passenger_phone) {
      return res.status(400).json({ 
        error: "passenger_id, route_id, passenger_name, and passenger_phone are required" 
      });
    }

    // Check if route exists and get fare
    const routeCheck = await pool.query(
      `SELECT route_id, route_name, fare_base, start_location, end_location FROM routes WHERE route_id = $1`,
      [route_id]
    );

    if (!routeCheck.rows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    const route = routeCheck.rows[0];

    // Validate vehicle if provided
    if (vehicle_id) {
      const vehicleCheck = await pool.query(
        `SELECT vehicle_id, plate_number FROM vehicles WHERE vehicle_id = $1 AND status = 'active'`,
        [vehicle_id]
      );

      if (!vehicleCheck.rows.length) {
        return res.status(404).json({ error: "Vehicle not found or not available" });
      }
    }

    // Calculate fare based on start/end stops if provided
    let finalAmount = amount_paid || route.fare_base || 0;
    let actualStart = actual_start_location || route.start_location;
    let actualEnd = actual_end_location || route.end_location;
    
    // If start_stop_id and end_stop_id are provided, calculate fare between stops
    if (start_stop_id && end_stop_id && start_stop_id !== end_stop_id) {
      try {
        const stopsResult = await pool.query(`
          SELECT stop_id, stop_order, fare_from_start, distance_from_start_km, stop_name
          FROM route_stops
          WHERE route_id = $1 AND (stop_id = $2 OR stop_id = $3)
          ORDER BY stop_order ASC
        `, [route_id, start_stop_id, end_stop_id]);

        if (stopsResult.rows.length === 2) {
          const [startStop, endStop] = stopsResult.rows.sort((a, b) => a.stop_order - b.stop_order);
          finalAmount = Math.abs(endStop.fare_from_start - startStop.fare_from_start);
          // Use actual stop names if not provided
          if (!actual_start_location && startStop.stop_name) {
            actualStart = startStop.stop_name;
          }
          if (!actual_end_location && endStop.stop_name) {
            actualEnd = endStop.stop_name;
          }
        }
      } catch (fareErr) {
        console.log("Error calculating fare from stops, using base fare:", fareErr.message);
      }
    }

    // Generate QR code for ticket
    const crypto = await import("crypto");
    const generateQRCode = (ticketId, vehicleId, routeId) => {
      const data = `${ticketId || 'temp'}-${vehicleId || 0}-${routeId}-${Date.now()}`;
      return crypto.default.createHash('sha256').update(data).digest('hex').substring(0, 32).toUpperCase();
    };
    const tempQR = generateQRCode(null, vehicle_id || 0, route_id);

    // Check which columns exist in tickets table
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasStartStopId = existingColumns.includes('start_stop_id');
    const hasEndStopId = existingColumns.includes('end_stop_id');
    const hasActualStart = existingColumns.includes('actual_start_location');
    const hasActualEnd = existingColumns.includes('actual_end_location');
    const hasCalculatedFare = existingColumns.includes('calculated_fare');
    const hasQRCode = existingColumns.includes('qr_code');
    const hasPassengerName = existingColumns.includes('passenger_name');
    const hasPassengerPhone = existingColumns.includes('passenger_phone');
    const hasPassengerEmail = existingColumns.includes('passenger_email');
    const hasPaymentMethod = existingColumns.includes('payment_method');

    // Build INSERT query dynamically based on existing columns (only required fields are always included)
    const insertFields = [
      'passenger_id',
      'route_id',
      'vehicle_id',
      'seat_number',
      'travel_date',
      'payment_status',
      'amount_paid'
    ];
    
    const insertValues = [
      passenger_id,
      route_id,
      vehicle_id || null,
      seat_number || null,
      travel_date || null,
      "pending",
      finalAmount
    ];

    // Add optional fields only if they exist
    if (hasPassengerName) {
      insertFields.push('passenger_name');
      insertValues.push(passenger_name);
    }
    if (hasPassengerPhone) {
      insertFields.push('passenger_phone');
      insertValues.push(passenger_phone);
    }
    if (hasPassengerEmail) {
      insertFields.push('passenger_email');
      insertValues.push(passenger_email || null);
    }
    if (hasPaymentMethod) {
      insertFields.push('payment_method');
      insertValues.push(payment_method || null);
    }
    if (hasQRCode) {
      insertFields.push('qr_code');
      insertValues.push(tempQR);
    }
    if (hasStartStopId) {
      insertFields.push('start_stop_id');
      insertValues.push(start_stop_id || null);
    }
    if (hasEndStopId) {
      insertFields.push('end_stop_id');
      insertValues.push(end_stop_id || null);
    }
    if (hasActualStart) {
      insertFields.push('actual_start_location');
      insertValues.push(actualStart);
    }
    if (hasActualEnd) {
      insertFields.push('actual_end_location');
      insertValues.push(actualEnd);
    }
    if (hasCalculatedFare) {
      insertFields.push('calculated_fare');
      insertValues.push(finalAmount);
    }

    // Build parameterized query
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO tickets (${insertFields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    // Insert ticket with passenger details
    const ticketResult = await pool.query(insertQuery, insertValues);

    // Update QR code with actual ticket ID (if qr_code column exists)
    const ticket = ticketResult.rows[0];
    if (hasQRCode) {
      const finalQR = generateQRCode(ticket.ticket_id, vehicle_id || 0, route_id);
      await pool.query(
        `UPDATE tickets SET qr_code = $1 WHERE ticket_id = $2`,
        [finalQR, ticket.ticket_id]
      );
    }
    
    // Refresh ticket to get updated QR code
    const updatedTicketResult = await pool.query(
      `SELECT * FROM tickets WHERE ticket_id = $1`,
      [ticket.ticket_id]
    );
    const updatedTicket = updatedTicketResult.rows[0];

    // Create notification for passenger when ticket is booked
    try {
      const notifyCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'notifications'
        )
      `);
      
      if (notifyCheck.rows[0]?.exists) {
        await pool.query(
          `INSERT INTO notifications (user_id, message, title) 
           VALUES ($1, $2, $3)`,
          [
            passenger_id,
            `Ticket booked successfully for "${route.route_name}" from ${actualStart} to ${actualEnd}. Ticket ID: ${ticket.ticket_id}. Amount: ${finalAmount} RWF. Please complete payment to confirm your booking.`,
            "Ticket Booked"
          ]
        );
      }
    } catch (notifErr) {
      console.log("Could not send notification:", notifErr.message);
    }

    res.status(201).json({
      message: "Ticket created. Please complete payment.",
      ticket: updatedTicket || ticket,
      fare: finalAmount,
      route: {
        route_name: route.route_name,
        start_location: route.start_location,
        end_location: route.end_location,
        expected_start_time: route.expected_start_time
      }
    });
  } catch (err) {
    console.error("Error booking ticket:", err);
    res.status(500).json({ error: "Failed to book ticket", details: err.message });
  }
};

// Process payment (MTN Mobile Money simulation)
export const processPayment = async (req, res) => {
  try {
    const { ticket_id, phone_number, transaction_id } = req.body;

    if (!ticket_id || !phone_number) {
      return res.status(400).json({ error: "ticket_id and phone_number are required" });
    }

    // Get ticket details
    const ticketCheck = await pool.query(
      `SELECT t.*, r.route_name, r.fare_base
       FROM tickets t
       JOIN routes r ON t.route_id = r.route_id
       WHERE t.ticket_id = $1`,
      [ticket_id]
    );

    if (!ticketCheck.rows.length) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketCheck.rows[0];

    // Validate phone number format (MTN Rwanda format)
    const phoneRegex = /^(250|0)?(72|73|78|79)[0-9]{7}$/;
    const cleanPhone = phone_number.replace(/\s+/g, '').replace(/^\+/, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: "Invalid MTN Mobile Money phone number format" });
    }

    // Simulate payment processing (in real app, this would call MTN API)
    // For now, we'll just update the ticket payment status
    const updateResult = await pool.query(
      `UPDATE tickets 
       SET payment_status = $1, 
           payment_method = $2,
           transaction_id = $3
       WHERE ticket_id = $4
       RETURNING *`,
      ["completed", "mtn_mobile_money", transaction_id || `MTN${Date.now()}`, ticket_id]
    );

    const updatedTicket = updateResult.rows[0];

    // Create or find user for notifications (by phone or email)
    let notificationUserId = ticket.passenger_id;
    
    if (ticket.passenger_email) {
      const emailUser = await pool.query(
        `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
        [ticket.passenger_email]
      );
      if (emailUser.rows.length > 0) {
        notificationUserId = emailUser.rows[0].user_id;
      }
    }

    // Also check by phone
    if (!notificationUserId || notificationUserId === ticket.passenger_id) {
      const phoneUser = await pool.query(
        `SELECT user_id FROM users WHERE phone = $1 LIMIT 1`,
        [ticket.passenger_phone]
      );
      if (phoneUser.rows.length > 0) {
        notificationUserId = phoneUser.rows[0].user_id;
      }
    }

    // Create notification for passenger
    await pool.query(
      `INSERT INTO notifications (user_id, message, title)
       VALUES ($1, $2, $3)`,
      [
        notificationUserId,
        `Payment confirmed! Your ticket for "${ticket.route_name}" has been confirmed. Ticket ID: ${ticket_id}. Amount: ${ticket.amount_paid || ticket.fare_base} RWF`,
        "Payment Confirmed"
      ]
    );

    // Also notify the buyer if different from passenger
    if (ticket.passenger_id !== notificationUserId) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, title)
         VALUES ($1, $2, $3)`,
        [
          ticket.passenger_id,
          `Ticket booked successfully for ${ticket.passenger_name}. Ticket ID: ${ticket_id}`,
          "Ticket Booked"
        ]
      );
    }

    res.status(200).json({
      message: "Payment processed successfully",
      ticket: updatedTicket,
      transaction_id: updatedTicket.transaction_id
    });
  } catch (err) {
    console.error("Error processing payment:", err);
    res.status(500).json({ error: "Failed to process payment", details: err.message });
  }
};

// Get all available vehicles (for selection during booking)
export const getAllAvailableVehicles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.vehicle_id,
        v.plate_number,
        v.model,
        v.capacity,
        v.status,
        v.assigned_route,
        v.assigned_driver,
        u.full_name AS driver_name,
        r.route_name,
        r.start_location,
        r.end_location
      FROM vehicles v
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN routes r ON v.assigned_route = r.route_id OR r.assigned_vehicle = v.vehicle_id
      WHERE v.status = 'active'
      ORDER BY v.plate_number ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};
