// backend/controllers/adminController.js
import { pool } from "../db.js";



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
export const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE vehicles SET assigned_driver = NULL WHERE assigned_driver = $1", [id]);
    await pool.query("DELETE FROM driver_assignments WHERE driver_id = $1", [id]);
    const result = await pool.query("DELETE FROM drivers WHERE driver_id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.status(200).json({ message: "Driver deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting driver:", err);
    res.status(500).json({ error: "Failed to delete driver" });
  }
};


// ------------------- VEHICLES -------------------
export const getAllVehicles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.vehicle_id, v.plate_number, v.model, v.capacity, v.status, c.company_name,
             d.driver_id, u.full_name AS driver_name
      FROM vehicles v
      LEFT JOIN companies c ON v.company_id = c.company_id
      LEFT JOIN drivers d ON v.assigned_driver = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      ORDER BY v.vehicle_id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};

export const addVehicle = async (req, res) => {
  try {
    const { company_id, plate_number, model, capacity, status } = req.body;
    const result = await pool.query(
      `INSERT INTO vehicles (company_id, plate_number, model, capacity, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [company_id, plate_number, model, capacity, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add vehicle" });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, model, capacity, status, assigned_driver } = req.body;
    const result = await pool.query(
      `UPDATE vehicles SET company_id=$1, model=$2, capacity=$3, status=$4, assigned_driver=$5
       WHERE vehicle_id=$6 RETURNING *`,
      [company_id, model, capacity, status, assigned_driver, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update vehicle" });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM vehicle_tracking WHERE vehicle_id = $1", [id]);
    await pool.query("DELETE FROM tickets WHERE vehicle_id = $1", [id]);
    await pool.query("DELETE FROM vehicles WHERE vehicle_id=$1", [id]);
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
};

export const assignDriverToVehicle = async (req, res) => {
  const { vehicleId } = req.params;
  const { driver_id } = req.body;
  if (!driver_id) return res.status(400).json({ error: "Driver ID is required" });

  try {
    const driverCheck = await pool.query(
      `SELECT d.driver_id, u.user_id FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.driver_id = $1`,
      [driver_id]
    );
    if (!driverCheck.rows.length) return res.status(404).json({ error: "Driver not found" });

    const result = await pool.query(
      `UPDATE vehicles SET assigned_driver=$1 WHERE vehicle_id=$2 RETURNING *`,
      [driver_id, vehicleId]
    );

    const driver = driverCheck.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [driver.user_id, `You have been assigned to vehicle ID ${vehicleId}`]
    );

    res.status(200).json({ message: "Driver assigned successfully", vehicle: result.rows[0] });
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
