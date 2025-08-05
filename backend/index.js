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
app.use(cors())
app.use(express.json())

connectDB()

app.use("/api/auth", authRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/dashboard", dashboardRoutes)

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API is healthy", time: new Date().toISOString() })
})

export default app // ✅ No app.listen here
