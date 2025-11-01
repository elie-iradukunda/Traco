import express from "express";
import { getUserNotifications } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/:userId", getUserNotifications);

export default router;
