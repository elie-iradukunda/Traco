import express from "express";
import {
  getRouteStops,
  addRouteStop,
  updateRouteStop,
  deleteRouteStop,
  calculateFareBetweenStops
} from "../controllers/routeStopsController.js";
import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes - passengers can view stops
router.get("/routes/:routeId/stops", getRouteStops);
router.get("/routes/:routeId/stops/:startStopId/:endStopId/fare", calculateFareBetweenStops);

// Admin routes
router.post("/routes/stops", authMiddleware, authorizeRole("admin"), addRouteStop);
router.put("/routes/stops/:stopId", authMiddleware, authorizeRole("admin"), updateRouteStop);
router.delete("/routes/stops/:stopId", authMiddleware, authorizeRole("admin"), deleteRouteStop);

export default router;

