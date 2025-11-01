import express from "express";
import { getPassengerTickets, getAllRoutes } from "../controllers/passengerController.js";

const router = express.Router();

router.get("/routes", getAllRoutes);
router.get("/tickets/:passengerId", getPassengerTickets);

export default router;


