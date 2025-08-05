// backend/index.js
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./DB/db.js"
import authRoutes from "./routes/authRoutes.js"
import courseRoutes from "./routes/courseRoutes.js"
import assignmentRoutes from "./routes/assignmentRoutes.js"
import submissionRoutes from "./routes/submissionRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"

dotenv.config()

const app = express()

// Middleware
app.use(express.json())
app.use(cors())

// DB
connectDB()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/dashboard", dashboardRoutes)

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Gradewise AI API is running",
    timestamp: new Date().toISOString(),
  })
})

// ✅ Only run the server in development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

// ✅ Export the app for serverless
export default app
