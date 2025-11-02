// backend/controllers/adminController.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";




export const registerDriverUser = async (req, res) => {
  try {
    const { full_name, email, phone, password, role, license_number, status } = req.body;

    // 1️⃣ Validate input
    if (!full_name || !email || !phone || !password || !license_number) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 2️⃣ Check if email already exists
    const existingUser = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Insert user into users table
    const userResult = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [full_name, email, phone, hashedPassword, role || "driver"]
    );

    const userId = userResult.rows[0].user_id;

    // 5️⃣ Insert driver details into drivers table
    const driverResult = await pool.query(
      `INSERT INTO drivers (user_id, license_number, status)
       VALUES ($1, $2, $3)
       RETURNING driver_id, user_id, license_number, status`,
      [userId, license_number, status || "active"]
    );

    // 6️⃣ Return success response
    res.status(201).json({
      message: "Driver registered successfully",
      driver: {
        user_id: userId,
        full_name,
        email,
        phone,
        license_number,
        status: status || "active",
      },
    });
  } catch (err) {
    console.error("Error registering driver:", err);
    res.status(500).json({ error: "Failed to register driver" });
  }
};



// ------------------- GET ALL DRIVERS -------------------
export const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.driver_id, 
        d.user_id,
        u.full_name, 
        u.email, 
        u.phone, 
        d.license_number,
        d.status,
        d.assigned_line_id,
        v.plate_number,
        v.vehicle_id,
        r.route_id,
        r.route_name
      FROM drivers d
      JOIN users u ON d.user_id = u.user_id
      LEFT JOIN vehicles v ON v.assigned_driver = d.driver_id
      LEFT JOIN routes r ON r.route_id = d.assigned_line_id
      ORDER BY d.driver_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching drivers:", err);
    res.status(500).json({ error: "Failed to fetch drivers", details: err.message });
  }
};

// ------------------- ADD DRIVER -------------------


export const addDriver = async (req, res) => {
  try {
    const { user_id, license_number, status } = req.body;

    if (!user_id || !license_number) {
      return res.status(400).json({ error: "user_id and license_number are required" });
    }

    // Check if user exists and is not already a driver
    const userCheck = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, d.driver_id
       FROM users u
       LEFT JOIN drivers d ON u.user_id = d.user_id
       WHERE u.user_id = $1`,
      [user_id]
    );

    if (!userCheck.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userCheck.rows[0].driver_id) {
      return res.status(400).json({ error: "User is already registered as a driver" });
    }

    // Add linked driver record
    const driverResult = await pool.query(
      `INSERT INTO drivers (user_id, license_number, status)
       VALUES ($1, $2, $3)
       RETURNING driver_id, user_id, license_number, status`,
      [user_id, license_number, status || "active"]
    );

    const driver = driverResult.rows[0];
    const user = userCheck.rows[0];

    res.status(201).json({
      message: "Driver created successfully",
      driver: {
        driver_id: driver.driver_id,
        user_id: driver.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        license_number: driver.license_number,
        status: driver.status,
      },
    });
  } catch (err) {
    console.error("❌ Error creating driver:", err);
    res.status(500).json({ error: "Failed to add driver", details: err.message });
  }
};

// ------------------- UPDATE DRIVER -------------------
export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { license_number, status } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (license_number !== undefined) {
      updates.push(`license_number = $${paramCount++}`);
      values.push(license_number);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE drivers SET ${updates.join(", ")} WHERE driver_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Fetch updated driver with user info
    const driverWithUser = await pool.query(`
      SELECT d.*, u.full_name, u.email, u.phone
      FROM drivers d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.driver_id = $1
    `, [id]);

    res.status(200).json({ 
      message: "Driver updated successfully", 
      driver: driverWithUser.rows[0] 
    });
  } catch (err) {
    console.error("❌ Error updating driver:", err);
    res.status(500).json({ error: "Failed to update driver", details: err.message });
  }
};

// ------------------- DELETE DRIVER -------------------
// controllers/adminController.js

export const deleteDriver = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("BEGIN");

    // Unassign driver from vehicles
    await pool.query(
      `UPDATE vehicles
       SET assigned_driver = NULL
       WHERE assigned_driver = $1`,
      [id]
    );

    // Unassign driver from vehicle_tracking
    await pool.query(
      `UPDATE vehicle_tracking 
       SET driver_id = NULL 
       WHERE driver_id = $1`,
      [id]
    );

    // Unassign driver from boarded_passengers
    await pool.query(
      `UPDATE boarded_passengers 
       SET confirmed_by = NULL 
       WHERE confirmed_by = $1`,
      [id]
    );

    // Delete driver record
    const result = await pool.query(
      `DELETE FROM drivers WHERE driver_id = $1 RETURNING *`,
      [id]
    );

    // Optional: Delete from users table if driver is stored as a user
    if (result.rowCount > 0) {
      await pool.query(
        `DELETE FROM users WHERE role = 'driver' AND full_name = $1`,
        [result.rows[0].full_name]
      );
    }

    await pool.query("COMMIT");

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.status(200).json({ message: "Driver deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error deleting driver:", error);
    res.status(500).json({
      message: "Error deleting driver",
      error: error.message,
    });
  }
};



// ------------------- VEHICLES -------------------
export const getAllVehicles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.vehicle_id, v.plate_number, v.model, v.capacity, v.status, c.company_name,
             d.driver_id, u.full_name AS driver_name, u.email AS driver_email
      FROM vehicles v
      LEFT JOIN companies c ON v.company_id = c.company_id
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      ORDER BY v.vehicle_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};

export const addVehicle = async (req, res) => {
  try {
    const { company_id, plate_number, model, capacity, status } = req.body;

    // Optional: Check if plate number already exists
    const plateCheck = await pool.query(
      `SELECT vehicle_id FROM vehicles WHERE plate_number=$1`,
      [plate_number]
    );
    if (plateCheck.rows.length) return res.status(400).json({ error: "Vehicle with this plate already exists" });

    const result = await pool.query(
      `INSERT INTO vehicles (company_id, plate_number, model, capacity, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [company_id, plate_number, model, capacity, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding vehicle:", err);
    res.status(500).json({ error: "Failed to add vehicle" });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, plate_number, model, capacity, status, assigned_driver } = req.body;

    // Optional: Check if assigned driver exists
    if (assigned_driver) {
      const driverCheck = await pool.query(`SELECT driver_id FROM drivers WHERE driver_id=$1`, [assigned_driver]);
      if (!driverCheck.rows.length) return res.status(404).json({ error: "Driver not found" });
    }

    const result = await pool.query(
      `UPDATE vehicles SET company_id=$1, plate_number=$2, model=$3, capacity=$4, status=$5, assigned_driver=$6
       WHERE vehicle_id=$7 RETURNING *`,
      [company_id, plate_number, model, capacity, status, assigned_driver || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Vehicle not found" });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({ error: "Failed to update vehicle" });
  }
};

export const deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");

    // Unassign driver if assigned
    await pool.query(`UPDATE vehicles SET assigned_driver=NULL WHERE vehicle_id=$1`, [id]);

    // Delete related records safely
    await pool.query("DELETE FROM vehicle_tracking WHERE vehicle_id=$1", [id]);
    await pool.query("DELETE FROM tickets WHERE vehicle_id=$1", [id]);

    const result = await pool.query("DELETE FROM vehicles WHERE vehicle_id=$1 RETURNING *", [id]);
    if (!result.rows.length) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Vehicle not found" });
    }

    await pool.query("COMMIT");
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error deleting vehicle:", err);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
};

export const assignDriverToVehicle = async (req, res) => {
  const { vehicleId } = req.params;
  const { driver_id } = req.body;

  if (!driver_id) return res.status(400).json({ error: "Driver ID is required" });

  try {
    // Get vehicle & driver info
    const vehicleRes = await pool.query(
      `SELECT vehicle_id, assigned_route FROM vehicles WHERE vehicle_id=$1`,
      [vehicleId]
    );
    const vehicle = vehicleRes.rows[0];
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    // Assign driver to vehicle
    await pool.query(
      `UPDATE vehicles SET assigned_driver=$1 WHERE vehicle_id=$2`,
      [driver_id, vehicleId]
    );

    // If vehicle has a route, assign driver to that route (update drivers.assigned_line_id)
    if (vehicle.assigned_route) {
      await pool.query(
        `UPDATE drivers SET assigned_line_id=$1 WHERE driver_id=$2`,
        [vehicle.assigned_route, driver_id]
      );
    }

    // Notification
    const userRes = await pool.query(
      `SELECT user_id FROM drivers WHERE driver_id=$1`,
      [driver_id]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [userRes.rows[0].user_id, `You have been assigned to vehicle ID ${vehicleId}`]
    );

    res.status(200).json({ message: "Driver assigned to vehicle successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign driver to vehicle" });
  }
};




// ------------------- ROUTES -------------------
export const getAllRoutes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c.company_name
      FROM routes r
      LEFT JOIN companies c ON r.company_id = c.company_id
      ORDER BY route_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
};

export const addRoute = async (req, res) => {
  try {
    const { company_id, route_name, start_location, end_location, distance_km, fare_base, map_url, expected_start_time } = req.body;
    const result = await pool.query(
      `INSERT INTO routes (company_id, route_name, start_location, end_location, distance_km, fare_base, map_url, expected_start_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, route_name, start_location, end_location, distance_km, fare_base, map_url, expected_start_time || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add route", details: err.message });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, route_name, start_location, end_location, distance_km, fare_base, map_url, expected_start_time } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (company_id !== undefined) {
      updates.push(`company_id = $${paramCount++}`);
      values.push(company_id);
    }
    if (route_name !== undefined) {
      updates.push(`route_name = $${paramCount++}`);
      values.push(route_name);
    }
    if (start_location !== undefined) {
      updates.push(`start_location = $${paramCount++}`);
      values.push(start_location);
    }
    if (end_location !== undefined) {
      updates.push(`end_location = $${paramCount++}`);
      values.push(end_location);
    }
    if (distance_km !== undefined) {
      updates.push(`distance_km = $${paramCount++}`);
      values.push(distance_km);
    }
    if (fare_base !== undefined) {
      updates.push(`fare_base = $${paramCount++}`);
      values.push(fare_base);
    }
    if (map_url !== undefined) {
      updates.push(`map_url = $${paramCount++}`);
      values.push(map_url);
    }
    if (expected_start_time !== undefined) {
      updates.push(`expected_start_time = $${paramCount++}`);
      values.push(expected_start_time || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE routes SET ${updates.join(", ")} WHERE route_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (!result.rows.length) return res.status(404).json({ error: "Route not found" });

    const routeWithCompany = await pool.query(
      `SELECT r.*, c.company_name
       FROM routes r
       LEFT JOIN companies c ON r.company_id = c.company_id
       WHERE r.route_id=$1`,
      [id]
    );

    res.status(200).json(routeWithCompany.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update route", details: err.message });
  }
};

export const deleteRoute = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");
    await client.query("DELETE FROM tickets WHERE route_id=$1", [id]);
    const result = await client.query("DELETE FROM routes WHERE route_id=$1 RETURNING *", [id]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Route not found" });
    }
    await client.query("COMMIT");
    res.status(200).json({ message: "Route deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to delete route" });
  } finally {
    client.release();
  }
};


export const assignVehicleToRoute = async (req, res) => {
  const { routeId } = req.params; // route id from URL
  const { vehicle_id } = req.body; // vehicle id from request body

  if (!vehicle_id) {
    return res.status(400).json({ error: "Vehicle ID is required" });
  }

  try {
    // 1️⃣ Check if vehicle exists
    const vehicleCheck = await pool.query(
      `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1`,
      [vehicle_id]
    );

    if (!vehicleCheck.rows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // 2️⃣ Check if route exists
    const routeCheck = await pool.query(
      `SELECT route_id FROM routes WHERE route_id = $1`,
      [routeId]
    );

    if (!routeCheck.rows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    // 3️⃣ Update route with the assigned vehicle
    const result = await pool.query(
      `UPDATE routes SET assigned_vehicle = $1 WHERE route_id = $2 RETURNING *`,
      [vehicle_id, routeId]
    );

    res.status(200).json({
      message: `Vehicle assigned to route successfully`,
      route: result.rows[0],
    });
  } catch (err) {
    console.error("Error assigning vehicle to route:", err);
    res.status(500).json({ error: "Failed to assign vehicle to route" });
  }
};




// controllers/adminController.js
export const assignDriverToRoute = async (req, res) => {
  const { routeId } = req.params;
  const { driver_id } = req.body;

  if (!driver_id) return res.status(400).json({ error: "Driver ID is required" });

  try {
    // 1️⃣ Check if the driver exists
    const driverCheck = await pool.query(
      `SELECT d.driver_id, u.user_id 
       FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.driver_id = $1`,
      [driver_id]
    );
    if (!driverCheck.rows.length) return res.status(404).json({ error: "Driver not found" });

    // 2️⃣ Check if route exists
    const routeCheck = await pool.query(
      `SELECT route_id, route_name, start_location, end_location FROM routes WHERE route_id = $1`,
      [routeId]
    );
    if (!routeCheck.rows.length) return res.status(404).json({ error: "Route not found" });

    const route = routeCheck.rows[0];

    // 3️⃣ Assign driver to the route (update drivers.assigned_line_id)
    await pool.query(
      `UPDATE drivers SET assigned_line_id=$1 WHERE driver_id=$2`,
      [routeId, driver_id]
    );

    // 3b️⃣ Also update the vehicle's assigned_route if the driver has a vehicle
    await pool.query(
      `UPDATE vehicles SET assigned_route=$1 
       WHERE assigned_driver=$2 AND status='active'`,
      [routeId, driver_id]
    );

    // 4️⃣ Send notification to the driver
    const driver = driverCheck.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, message, title) VALUES ($1, $2, $3)`,
      [
        driver.user_id,
        `You have been assigned to route: ${route.route_name} (${route.start_location} - ${route.end_location})`,
        "New Route Assignment"
      ]
    );

    res.status(200).json({ 
      message: "Driver assigned to route successfully", 
      route: route 
    });

  } catch (err) {
    console.error("Error assigning driver to route:", err);
    res.status(500).json({ error: "Failed to assign driver to route", details: err.message });
  }
};


// ------------------- TICKETS -------------------
export const getAllTickets = async (req, res) => {
  try {
    // First, check which columns exist in the tickets table
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasActualStart = existingColumns.includes('actual_start_location');
    const hasActualEnd = existingColumns.includes('actual_end_location');
    const hasCalculatedFare = existingColumns.includes('calculated_fare');
    const hasBoardingStatus = existingColumns.includes('boarding_status');
    const hasJourneyStatus = existingColumns.includes('journey_status');
    
    // Build SELECT clause dynamically based on existing columns
    const selectFields = [
      't.ticket_id',
      'COALESCE(t.passenger_name, u.full_name) AS passenger_name',
      't.passenger_phone',
      't.passenger_email',
      'r.route_name',
      hasActualStart ? 't.actual_start_location' : 'NULL AS actual_start_location',
      hasActualEnd ? 't.actual_end_location' : 'NULL AS actual_end_location',
      't.payment_status',
      hasBoardingStatus ? 't.boarding_status' : "NULL AS boarding_status",
      hasJourneyStatus ? 't.journey_status' : 'NULL AS journey_status',
      't.amount_paid',
      hasCalculatedFare ? 't.calculated_fare' : 't.amount_paid AS calculated_fare',
      't.created_at',
      'v.plate_number AS vehicle_plate',
      'v.vehicle_id',
      'd.driver_id',
      'u2.full_name AS driver_name'
    ];
    
    const result = await pool.query(`
      SELECT 
        ${selectFields.join(',\n        ')}
      FROM tickets t
      LEFT JOIN users u ON t.passenger_id = u.user_id
      JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u2 ON d.user_id = u2.user_id
      ORDER BY t.ticket_id DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets", details: err.message });
  }
};

export const addTicket = async (req, res) => {
  try {
    const { passenger_id, route_id, vehicle_id, seat_number, travel_date } = req.body;

    if (!passenger_id || !route_id) {
      return res.status(400).json({ error: "passenger_id and route_id are required" });
    }

    // Validate passenger exists
    const passengerCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1`,
      [passenger_id]
    );
    if (!passengerCheck.rows.length) {
      return res.status(404).json({ error: "Passenger not found" });
    }

    // Validate route exists
    const routeCheck = await pool.query(
      `SELECT route_id FROM routes WHERE route_id = $1`,
      [route_id]
    );
    if (!routeCheck.rows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    // If vehicle_id provided, validate it exists
    if (vehicle_id) {
      const vehicleCheck = await pool.query(
        `SELECT vehicle_id FROM vehicles WHERE vehicle_id = $1`,
        [vehicle_id]
      );
      if (!vehicleCheck.rows.length) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
    }

    const result = await pool.query(
      `INSERT INTO tickets (passenger_id, route_id, vehicle_id, seat_number, travel_date)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [passenger_id, route_id, vehicle_id || null, seat_number || null, travel_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding ticket:", err);
    res.status(500).json({ error: "Failed to add ticket", details: err.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, seat_number, travel_date, payment_status } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (payment_status !== undefined) {
      updates.push(`payment_status = $${paramCount++}`);
      values.push(payment_status);
    }
    if (vehicle_id !== undefined) {
      updates.push(`vehicle_id = $${paramCount++}`);
      values.push(vehicle_id || null);
    }
    if (seat_number !== undefined) {
      updates.push(`seat_number = $${paramCount++}`);
      values.push(seat_number || null);
    }
    if (travel_date !== undefined) {
      updates.push(`travel_date = $${paramCount++}`);
      values.push(travel_date || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE tickets SET ${updates.join(", ")} WHERE ticket_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (!result.rowCount) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Get updated ticket with related data
    const ticketWithDetails = await pool.query(`
      SELECT 
        t.*,
        r.route_name,
        r.start_location,
        r.end_location,
        v.plate_number,
        u.full_name AS passenger_name
      FROM tickets t
      LEFT JOIN routes r ON t.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON t.passenger_id = u.user_id
      WHERE t.ticket_id = $1
    `, [id]);

    res.status(200).json({
      message: "Ticket updated successfully",
      ticket: ticketWithDetails.rows[0]
    });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ error: "Failed to update ticket", details: err.message });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM tickets WHERE ticket_id=$1 RETURNING *", [id]);
    if (!result.rowCount) return res.status(404).json({ error: "Ticket not found" });
    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
};

// ------------------- COMPANIES -------------------
export const getCompanies = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM companies ORDER BY company_id ASC");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

// ------------------- USERS -------------------
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, full_name, email, phone, role FROM users ORDER BY user_id ASC");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ------------------- STATS -------------------
export const getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM drivers) AS total_drivers,
        (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
        (SELECT COUNT(*) FROM routes) AS total_routes,
        (SELECT COUNT(*) FROM tickets) AS total_tickets
    `);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
