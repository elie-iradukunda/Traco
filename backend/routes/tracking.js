import express from "express";
import {
  updateVehicleLocation,
  getVehicleLocation,
  getAllVehicleLocations,
  getVehicleLocationHistory,
  getMyVehicleLocation
} from "../controllers/trackingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/update", authMiddleware, updateVehicleLocation);

router.get("/vehicle/:vehicle_id", getVehicleLocation);

router.get("/all", getAllVehicleLocations);

router.get("/history/:vehicle_id", getVehicleLocationHistory);

router.get("/my-vehicle/:ticket_id", authMiddleware, getMyVehicleLocation);

export default router;
