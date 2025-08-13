import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./DB/db.js"
import authRoutes from "./routes/authRoutes.js"
import assessmentRoutes from "./routes/assessmentRoutes.js"
import resourceRoutes from "./routes/resourceRoutes.js"
import assignmentRoutes from "./routes/assignmentRoutes.js"
import submissionRoutes from "./routes/submissionRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"

// Load environment variables from .env file
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware to parse JSON bodies
app.use(express.json())

// Enable CORS for all origins (you might want to restrict this in production)
app.use(cors())

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))

// Connect to PostgreSQL database and ensure tables are created
connectDB()

// Define routes
app.use("/api/auth", authRoutes)
app.use("/api/assessments", assessmentRoutes)
app.use("/api/resources", resourceRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Gradewise AI API is running",
    timestamp: new Date().toISOString(),
  })
})

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})
