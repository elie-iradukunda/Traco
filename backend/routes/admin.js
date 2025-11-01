import express from "express";
import {
  getAllDrivers,
  addDriver,          // fixed: matches controller
  updateDriver,
  deleteDriver,
  getAllVehicles,
  addVehicle,         // fixed: matches controller
  updateVehicle,
  deleteVehicle,
  assignDriverToVehicle,
  getAllRoutes,
  addRoute,
  updateRoute,
  deleteRoute,
  getCompanies,
  getAllUsers,
  getAllTickets,
  getStats
} from "../controllers/adminController.js";

import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- DRIVERS -------------------
// Admin-only
router.get("/drivers", authMiddleware, authorizeRole("admin"), getAllDrivers);
router.post("/drivers", authMiddleware, authorizeRole("admin"), addDriver); // admin creates driver
router.put("/drivers/:id", authMiddleware, authorizeRole("admin"), updateDriver);
router.delete("/drivers/:id", authMiddleware, authorizeRole("admin"), deleteDriver);

// ------------------- VEHICLES -------------------
// Admin-only
router.get("/vehicles", authMiddleware, authorizeRole("admin"), getAllVehicles);
router.post("/vehicles", authMiddleware, authorizeRole("admin"), addVehicle);
router.put("/vehicles/:id", authMiddleware, authorizeRole("admin"), updateVehicle);
router.delete("/vehicles/:id", authMiddleware, authorizeRole("admin"), deleteVehicle);

router.post("/vehicles/:vehicleId/assign-driver", authMiddleware, authorizeRole("admin"), assignDriverToVehicle);

// ------------------- ROUTES -------------------
// Admin-only
router.get("/routes", authMiddleware, authorizeRole("admin"), getAllRoutes);
router.post("/routes", authMiddleware, authorizeRole("admin"), addRoute);
router.put("/routes/:id", authMiddleware, authorizeRole("admin"), updateRoute);
router.delete("/routes/:id", authMiddleware, authorizeRole("admin"), deleteRoute);

// ------------------- COMPANIES -------------------
router.get("/companies", authMiddleware, authorizeRole("admin"), getCompanies);

// ------------------- USERS -------------------
router.get("/users", authMiddleware, authorizeRole("admin"), getAllUsers);

// ------------------- TICKETS -------------------
router.get("/tickets", authMiddleware, authorizeRole("admin"), getAllTickets);

// ------------------- REPORTS / STATS -------------------
router.get("/stats", authMiddleware, authorizeRole("admin"), getStats);

export default router;
