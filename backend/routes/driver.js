import express from "express";
import { getDriverAssignments } from "../controllers/driverController.js";

const router = express.Router();

router.get("/assignments/:driverId", getDriverAssignments);

export default router;
