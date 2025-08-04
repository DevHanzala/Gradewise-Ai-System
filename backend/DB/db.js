import pg from "pg"
import dotenv from "dotenv"
import { createUserTable } from "../models/userModel.js"
import {
  createCourseTable,
  createStudentsCoursesTable,
  createAssignmentsTable,
  createSubmissionsTable,
} from "../models/courseModel.js"

// Load environment variables
dotenv.config()

const { Pool } = pg

// Create a new Pool instance for connecting to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Your Neon DB connection string
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB connections
  },
})

// Function to connect to the database and create necessary tables
export const connectDB = async () => {
  try {
    const client = await pool.connect()
    console.log("✅ Connected to PostgreSQL (Neon)")

    // Create all tables in the correct order (respecting foreign key dependencies)
    await createUserTable() // Users table must be created first
    await createCourseTable() // Courses table depends on users
    await createStudentsCoursesTable() // Junction table depends on users and courses
    await createAssignmentsTable() // Assignments table depends on courses and users
    await createSubmissionsTable() // Submissions table depends on users and assignments

    console.log("✅ All database tables checked/created successfully")

    client.release() // Release the client back to the pool
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message)
    process.exit(1)
  }
}

// Export the pool for use in models and controllers
export default pool
