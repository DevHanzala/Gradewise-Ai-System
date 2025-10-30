import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
// REMOVED: import fs from "fs/promises";
// REMOVED: import path from "path"; → not needed anymore

dotenv.config({ path: new URL('.env', import.meta.url).pathname });
console.log("GEMINI_CREATION_API_KEY loaded:", process.env.GEMINI_CREATION_API_KEY ? "Yes" : "No");

const app = express();
const PORT = process.env.PORT || 5000;

// REMOVED: ensureUploadsDir function — no disk, no folder needed

// Connect to database and initialize tables
const startServer = async () => {
  try {
    await connectDB(); // Connect to database
    await initResourceModel(); // Initialize resources and resource_chunks
    await initAssessmentModel(); // Initialize assessments, question_blocks, etc.
    // REMOVED: await ensureUploadsDir(); → no disk usage

    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`API Health Check: http://localhost:${PORT}/api/health`);
    app.listen(PORT);
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