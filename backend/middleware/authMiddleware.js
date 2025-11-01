// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = "your_secret_key";

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token
  if(!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { user_id, role }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeRole = (...roles) => (req, res, next) => {
  if(!roles.includes(req.user.role)) return res.status(403).json({ error: "Access denied" });
  next();
};
