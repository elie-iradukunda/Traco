import express from "express";
import { 
  getPassengerTickets, 
  getAllRoutes, 
  bookTicket,
  processPayment,
  getVehiclesForRoute,
  getAllAvailableVehicles
} from "../controllers/passengerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/routes", getAllRoutes);
router.get("/vehicles", getAllAvailableVehicles);
router.get("/vehicles/route/:routeId", getVehiclesForRoute);

// Protected routes - require authentication
router.get("/tickets/:passengerId", authMiddleware, getPassengerTickets);
router.post("/tickets/book", authMiddleware, bookTicket);
router.post("/tickets/pay", authMiddleware, processPayment);

export default router;


