import { pool } from "../db.js";

// Submit a review/rating
export const submitReview = async (req, res) => {
  try {
    const { passenger_id, route_id, driver_id, vehicle_id, rating, comment } = req.body;

    if (!passenger_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "passenger_id and rating (1-5) are required" });
    }

    // Check if reviews table exists, if not create it
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reviews'
      )
    `);

    if (!tableCheck.rows[0]?.exists) {
      // Create reviews table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          review_id SERIAL PRIMARY KEY,
          passenger_id INTEGER REFERENCES users(user_id),
          route_id INTEGER REFERENCES routes(route_id),
          driver_id INTEGER REFERENCES drivers(driver_id),
          vehicle_id INTEGER REFERENCES vehicles(vehicle_id),
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Check if user already reviewed this route/driver/vehicle
    let existingReview;
    if (route_id) {
      existingReview = await pool.query(
        `SELECT review_id FROM reviews WHERE passenger_id = $1 AND route_id = $2`,
        [passenger_id, route_id]
      );
    } else if (driver_id) {
      existingReview = await pool.query(
        `SELECT review_id FROM reviews WHERE passenger_id = $1 AND driver_id = $2`,
        [passenger_id, driver_id]
      );
    } else if (vehicle_id) {
      existingReview = await pool.query(
        `SELECT review_id FROM reviews WHERE passenger_id = $1 AND vehicle_id = $2`,
        [passenger_id, vehicle_id]
      );
    }

    if (existingReview?.rows.length > 0) {
      // Update existing review
      const result = await pool.query(
        `UPDATE reviews 
         SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP
         WHERE review_id = $3
         RETURNING *`,
        [rating, comment || null, existingReview.rows[0].review_id]
      );
      return res.status(200).json({ message: "Review updated successfully", review: result.rows[0] });
    }

    // Insert new review
    const result = await pool.query(
      `INSERT INTO reviews (passenger_id, route_id, driver_id, vehicle_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [passenger_id, route_id || null, driver_id || null, vehicle_id || null, rating, comment || null]
    );

    res.status(201).json({ message: "Review submitted successfully", review: result.rows[0] });
  } catch (err) {
    console.error("Error submitting review:", err);
    res.status(500).json({ error: "Failed to submit review", details: err.message });
  }
};

// Get reviews for a route/driver/vehicle
export const getReviews = async (req, res) => {
  try {
    const { route_id, driver_id, vehicle_id } = req.query;

    let query = `
      SELECT 
        r.review_id,
        r.rating,
        r.comment,
        r.created_at,
        u.full_name AS passenger_name,
        u.email AS passenger_email
      FROM reviews r
      JOIN users u ON r.passenger_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (route_id) {
      query += ` AND r.route_id = $${paramCount++}`;
      params.push(route_id);
    }
    if (driver_id) {
      query += ` AND r.driver_id = $${paramCount++}`;
      params.push(driver_id);
    }
    if (vehicle_id) {
      query += ` AND r.vehicle_id = $${paramCount++}`;
      params.push(vehicle_id);
    }

    query += ` ORDER BY r.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews", details: err.message });
  }
};

// Get average rating
export const getAverageRating = async (req, res) => {
  try {
    const { route_id, driver_id, vehicle_id } = req.query;

    let query = `
      SELECT 
        AVG(rating) AS average_rating,
        COUNT(*) AS total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
      FROM reviews
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (route_id) {
      query += ` AND route_id = $${paramCount++}`;
      params.push(route_id);
    }
    if (driver_id) {
      query += ` AND driver_id = $${paramCount++}`;
      params.push(driver_id);
    }
    if (vehicle_id) {
      query += ` AND vehicle_id = $${paramCount++}`;
      params.push(vehicle_id);
    }

    const result = await pool.query(query, params);
    res.status(200).json(result.rows[0] || { average_rating: 0, total_reviews: 0 });
  } catch (err) {
    console.error("Error fetching average rating:", err);
    res.status(500).json({ error: "Failed to fetch average rating", details: err.message });
  }
};

