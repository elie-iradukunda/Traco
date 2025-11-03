import express from "express";
import { getDriverAssignments, getDriverIdByUserId } from "../controllers/driverController.js";
import {
  getVehiclePassengers,
  scanTicket,
  confirmBoarding,
  updateLocation,
  startJourney,
  stopJourney
} from "../controllers/journeyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get driver_id from user_id
router.get("/driver-id/:userId", authMiddleware, getDriverIdByUserId);

// Protected route - drivers can see their assignments by driver_id or user_id
router.get("/assignments/:driverId", authMiddleware, getDriverAssignments);

// Get assignments for current logged-in driver (from token)
router.get("/assignments", authMiddleware, getDriverAssignments);

// Journey management
router.get("/passengers", authMiddleware, getVehiclePassengers);
router.get("/passengers/:driverId", authMiddleware, getVehiclePassengers);
router.post("/scan-ticket", authMiddleware, scanTicket);
router.post("/confirm-boarding", authMiddleware, confirmBoarding);
router.post("/update-location", authMiddleware, updateLocation);
router.post("/start-journey", authMiddleware, startJourney);
router.post("/stop-journey", authMiddleware, stopJourney);

export default router;
