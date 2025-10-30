import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http"; // <-- NEW
import { Server } from "socket.io";   // <-- NEW
import { connectDB } from "./DB/db.js";
import { init as initAssessmentModel } from "./models/assessmentModel.js";
import { init as initResourceModel } from "./models/resourceModel.js";
import authRoutes from "./routes/authRoutes.js";
import assessmentRoutes from "./routes/assessmentRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import studentAnalyticsRoutes from "./routes/studentAnalyticsRoutes.js";
import takingRoutes from "./routes/takingRoutes.js";
import instructorAssessmentAnalyticsRoutes from "./routes/instructorAssessmentAnalyticsRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config({ path: new URL('.env', import.meta.url).pathname });
console.log("GEMINI_CREATION_API_KEY loaded:", process.env.GEMINI_CREATION_API_KEY ? "Yes" : "No");

const app = express();
const PORT = process.env.PORT || 5000;

// NEW: HTTP + Socket.IO Server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

// NEW: Make `io` available in routes via `req.app`
app.set("io", io);

// NEW: Optional – Track active upload sockets
const uploadSockets = new Map(); // socketId → userId

io.on("connection", (socket) => {
  console.log(`WebSocket connected: ${socket.id}`);

  // Optional: Authenticate socket if needed
  socket.on("register-upload", (userId) => {
    uploadSockets.set(socket.id, userId);
    console.log(`Upload socket registered: ${socket.id} → user ${userId}`);
  });

  socket.on("disconnect", () => {
    uploadSockets.delete(socket.id);
    console.log(`WebSocket disconnected: ${socket.id}`);
  });
});

// Connect to database and initialize tables
const startServer = async () => {
  try {
    await connectDB();
    await initResourceModel();
    await initAssessmentModel();

    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`API Health Check: http://localhost:${PORT}/api/health`);

    // CHANGED: Use httpServer instead of app.listen
    httpServer.listen(PORT);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/student-analytics", studentAnalyticsRoutes);
app.use("/api/taking", takingRoutes);
app.use("/api/instructor-analytics", instructorAssessmentAnalyticsRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gradewise AI Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
startServer();

// Handle unhandled errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err.message);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});

export default app;