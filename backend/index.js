// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import adminRoutes from "./routes/admin.js";
import driverRoutes from "./routes/driver.js";
import passengerRoutes from "./routes/passenger.js";
import publicRoutes from "./routes/public.js";
import notificationRoutes from "./routes/notifications.js";
import authRoutes from "./routes/authRoutes.js"; // <-- import authRoutes

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(express.json());

// ------------------- ROUTES -------------------
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/driver", driverRoutes);
app.use("/passenger", passengerRoutes);
app.use("/public", publicRoutes);
app.use("/notifications", notificationRoutes);

// ------------------- DEFAULT ROUTE -------------------
app.get("/", (req, res) => res.send("Backend running"));

// ------------------- START SERVER -------------------
app.listen(port, () => console.log(`Server running on port ${port}`));
