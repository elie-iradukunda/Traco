import express from "express";
import { getUserNotifications, sendNotification } from "../controllers/notificationController.js";
import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get notifications for a user
router.get("/:userId", authMiddleware, getUserNotifications);

// Send notification (admin only)
router.post("/", authMiddleware, authorizeRole("admin"), sendNotification);

export default router;
