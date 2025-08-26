import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./DB/db.js"
import authRoutes from "./routes/authRoutes.js"
import assessmentRoutes from "./routes/assessmentRoutes.js"
import assessmentTakingRoutes from "./routes/assessmentTakingRoutes.js"
import aiGenerationRoutes from "./routes/aiGenerationRoutes.js"
import autoGradingRoutes from "./routes/autoGradingRoutes.js"
import studentAnalyticsRoutes from "./routes/studentAnalyticsRoutes.js"
import enrollmentRoutes from "./routes/enrollmentRoutes.js"
import questionBankRoutes from "./routes/questionBankRoutes.js"
import questionRoutes from "./routes/questionRoutes.js"
import resourceRoutes from "./routes/resourceRoutes.js"
import courseRoutes from "./routes/courseRoutes.js"
import assignmentRoutes from "./routes/assignmentRoutes.js"
import submissionRoutes from "./routes/submissionRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import { errorHandler, notFound } from "./middleware/errorMiddleware.js"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Connect to database and create tables
connectDB()

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`)
    next()
  })
}

// Routes
app.use("/api/auth", authRoutes)
// Assessment taking routes (must come before general assessment routes to avoid conflicts)
app.use("/api/assessments", assessmentTakingRoutes)

// Assessment routes
app.use("/api/assessments", assessmentRoutes)
// AI Generation routes
app.use("/api/ai-generation", aiGenerationRoutes)
// Auto-grading routes
app.use("/api/auto-grading", autoGradingRoutes)
// Student analytics routes
app.use("/api/student-analytics", studentAnalyticsRoutes)
// Enhanced enrollment routes
app.use("/api/enrollment", enrollmentRoutes)
// Question bank routes
app.use("/api/question-bank", questionBankRoutes)
app.use("/api/questions", questionRoutes)
app.use("/api/resources", resourceRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gradewise AI Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  })
})

// 404 handler for undefined routes
app.use(notFound)

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`)
  console.log(`🔧 API Health Check: http://localhost:${PORT}/api/health`)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("❌ Unhandled Promise Rejection:", err.message)
  // Close server & exit process
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message)
  process.exit(1)
})

export default app
