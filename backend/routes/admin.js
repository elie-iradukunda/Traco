import express from "express";
import {
  getAllDrivers,
  addDriver,
  updateDriver,
  deleteDriver,
  getAllVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  assignDriverToVehicle,
  assignVehicleToRoute,
  assignDriverToRoute,
  getAllRoutes,
  addRoute,
  updateRoute,
  deleteRoute,
  getCompanies,
  getAllUsers,
  getAllTickets,
  addTicket,
  updateTicket,
  deleteTicket,
  getStats,
  registerDriverUser,
  getRevenueAnalytics,
  getRoutePerformance
} from "../controllers/adminController.js";

import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";
import {
  getAllPassengersWithTickets,
  getDriverAssignments as getAdminDriverAssignments
} from "../controllers/journeyController.js";

const router = express.Router();

// ------------------- DRIVERS -------------------
// Admin-only routes
router.get("/drivers", authMiddleware, authorizeRole("admin"), getAllDrivers);
router.post("/drivers", authMiddleware, authorizeRole("admin"), addDriver);
router.put("/drivers/:id", authMiddleware, authorizeRole("admin"), updateDriver);
router.delete("/drivers/:id", authMiddleware, authorizeRole("admin"), deleteDriver);
router.post("/drivers/register", registerDriverUser);


// ------------------- VEHICLES -------------------
// Admin-only
router.get("/vehicles", authMiddleware, authorizeRole("admin"), getAllVehicles);
router.post("/vehicles", authMiddleware, authorizeRole("admin"), addVehicle);
router.put("/vehicles/:id", authMiddleware, authorizeRole("admin"), updateVehicle);
router.delete("/vehicles/:id", authMiddleware, authorizeRole("admin"), deleteVehicle);

router.post("/vehicles/:vehicleId/assign-driver", authMiddleware, authorizeRole("admin"), assignDriverToVehicle);
router.put(
  "/routes/:routeId/assign-vehicle",
  authMiddleware,
  authorizeRole("admin"),
  assignVehicleToRoute
);


// Assign driver to route
// Assign driver to route
router.post(
  "/routes/:routeId/assign-driver",
  authMiddleware,
  authorizeRole("admin"),
  assignDriverToRoute
);



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
router.post("/tickets", authMiddleware, authorizeRole("admin"), addTicket);
router.put("/tickets/:id", authMiddleware, authorizeRole("admin"), updateTicket);
router.delete("/tickets/:id", authMiddleware, authorizeRole("admin"), deleteTicket);

// ------------------- REPORTS / STATS -------------------
router.get("/stats", authMiddleware, authorizeRole("admin"), getStats);
router.get("/analytics/revenue", authMiddleware, authorizeRole("admin"), getRevenueAnalytics);
router.get("/analytics/route-performance", authMiddleware, authorizeRole("admin"), getRoutePerformance);

// ------------------- PASSENGERS & DRIVER ASSIGNMENTS -------------------
router.get("/passengers", authMiddleware, authorizeRole("admin"), getAllPassengersWithTickets);
router.get("/driver-assignments", authMiddleware, authorizeRole("admin"), getAdminDriverAssignments);

export default router;
