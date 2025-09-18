import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { findUserByEmail } from "../models/userModel.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to protect routes by verifying JWT token.
 */
export const protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
      console.log(`🔍 Verifying token for ${req.originalUrl}: ${token.slice(0, 10)}...`);
    }

    if (!token) {
      console.error(`❌ No token provided in request to ${req.originalUrl}`);
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`✅ Token decoded for ${req.originalUrl}: id=${decoded.id}, role=${decoded.role}`);

    // Check for roles misuse in payload
    if (decoded.roles) {
      console.error(`❌ JWT payload contains 'roles' array: ${JSON.stringify(decoded.roles)}. Expected 'role' as string.`);
      return res.status(400).json({ success: false, message: "Invalid token: 'roles' detected in payload" });
    }

    // Fetch user from database to confirm role (fresh data)
    const user = await findUserByEmail(decoded.email);
    if (!user) {
      console.warn(`⚠️ User not found for email: ${decoded.email}`);
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Ensure user has role (string, not array)
    if (!user.role || typeof user.role !== "string") {
      console.error(`❌ Invalid user role: ${JSON.stringify(user.role)} (expected string)`);
      return res.status(400).json({ success: false, message: "Invalid user role" });
    }

    // Set req.user with role (singular)
    req.user = { id: user.id, email: user.email, role: user.role };
    console.log(`✅ User authenticated for ${req.originalUrl}: role=${req.user.role}`);

    next();
  } catch (error) {
    console.error(`❌ Token verification failed for ${req.originalUrl}: ${error.message}`);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/**
 * Middleware to authorize based on user roles.
 * Supports both: authorizeRoles("instructor", "admin", "super_admin") and authorizeRoles(["instructor", "admin", "super_admin"])
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Flatten roles if a single array is passed; otherwise, use rest params
    const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;
    
    // Log allowed roles for debugging
    console.log(`🔍 Authorizing for ${req.originalUrl}: allowed=[${allowedRoles.join(', ')}], userRole=${req.user?.role}`);

    // Check for roles misuse
    if (req.user?.roles) {
      console.error(`❌ req.user contains 'roles' array: ${JSON.stringify(req.user.roles)}. Expected 'role' as string.`);
      return res.status(400).json({ success: false, message: "Invalid user data: 'roles' detected" });
    }

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn(`⚠️ Access denied to ${req.originalUrl}: userRole=${req.user?.role || 'none'}, allowed=[${allowedRoles.join(', ')}]`);
      return res.status(403).json({ success: false, message: "Access denied: Insufficient permissions" });
    }

    console.log(`✅ Authorized for ${req.originalUrl}: role=${req.user.role}`);
    next();
  };
};