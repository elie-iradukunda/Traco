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
        u.full_name, 
        u.email, 
        u.phone, 
        d.license_number, 
        d.status
      FROM drivers d
      JOIN users u ON d.user_id = u.user_id
      ORDER BY d.driver_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching drivers:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
};

// ------------------- ADD DRIVER -------------------


export const addDriver = async (req, res) => {
  try {
    const { full_name, email, phone, password, license_number, status } = req.body;

    if (!full_name || !email || !phone || !password || !license_number) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await pool.query("BEGIN"); // Start transaction

    // 1️⃣ Add user with role = 'driver'
    const userInsert = `
      INSERT INTO users (full_name, email, phone, password, role)
      VALUES ($1, $2, $3, $4, 'driver')
      RETURNING user_id;
    `;
    const userResult = await pool.query(userInsert, [
      full_name,
      email,
      phone,
      password,
    ]);
    const user_id = userResult.rows[0].user_id;

    // 2️⃣ Add linked driver record
    const driverInsert = `
      INSERT INTO drivers (user_id, license_number, status)
      VALUES ($1, $2, $3)
      RETURNING driver_id;
    `;
    const driverResult = await pool.query(driverInsert, [
      user_id,
      license_number,
      status || "active",
    ]);

    await pool.query("COMMIT");

    res.status(201).json({
      message: "Driver created successfully",
      driver: {
        driver_id: driverResult.rows[0].driver_id,
        full_name,
        email,
        phone,
        license_number,
        status: status || "active",
      },
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Error creating driver:", err);
    res.status(500).json({ error: "Failed to add driver" });
  }
};

// ------------------- UPDATE DRIVER -------------------
export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { license_number, status } = req.body;

    const result = await pool.query(
      `UPDATE drivers 
       SET license_number = COALESCE($1, license_number), 
           status = COALESCE($2, status)
       WHERE driver_id = $3
       RETURNING *`,
      [license_number, status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.status(200).json({ message: "Driver updated successfully", driver: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating driver:", err);
    res.status(500).json({ error: "Failed to update driver" });
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
    const { company_id, route_name, start_location, end_location, distance_km, fare_base, map_url } = req.body;
    const result = await pool.query(
      `INSERT INTO routes (company_id, route_name, start_location, end_location, distance_km, fare_base, map_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [company_id, route_name, start_location, end_location, distance_km, fare_base, map_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add route" });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, route_name, start_location, end_location, distance_km, fare_base, map_url } = req.body;

    const result = await pool.query(
      `UPDATE routes SET company_id=$1, route_name=$2, start_location=$3, end_location=$4,
       distance_km=$5, fare_base=$6, map_url=$7 WHERE route_id=$8 RETURNING *`,
      [company_id, route_name, start_location, end_location, distance_km, fare_base, map_url, id]
    );

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
    res.status(500).json({ error: "Failed to update route" });
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

    // 2️⃣ Assign driver to the route
    const result = await pool.query(
      `UPDATE routes SET assigned_driver=$1 WHERE route_id=$2 RETURNING *`,
      [driver_id, routeId]
    );

    // 3️⃣ Send notification to the driver
    const driver = driverCheck.rows[0];
    const route = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [
        driver.user_id,
        `You have been assigned to route: ${route.route_name} (${route.start_location} - ${route.end_location})`
      ]
    );

    res.status(200).json({ message: "Driver assigned to route successfully", route: result.rows[0] });

  } catch (err) {
    console.error("Error assigning driver to route:", err);
    res.status(500).json({ error: "Failed to assign driver to route" });
  }
};


// ------------------- TICKETS -------------------
export const getAllTickets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.ticket_id, u.full_name AS passenger_name, r.route_name, t.status, t.created_at
      FROM tickets t
      JOIN users u ON t.passenger_id = u.user_id
      JOIN routes r ON t.route_id = r.route_id
      ORDER BY t.ticket_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

export const addTicket = async (req, res) => {
  try {
    const { passenger_id, route_id, status } = req.body;
    const result = await pool.query(
      `INSERT INTO tickets (passenger_id, route_id, status) VALUES ($1,$2,$3) RETURNING *`,
      [passenger_id, route_id, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add ticket" });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE tickets SET status=$1 WHERE ticket_id=$2 RETURNING *`,
      [status, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Ticket not found" });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ticket" });
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
