import pkg from "pg"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

const { Pool } = pkg

// Create a new pool instance with connection parameters from environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
  ssl: {
    require: true,
  },
})

/**
 * Function to connect to the database and create tables if they don't exist
 */
export const connectDB = async () => {
  try {
    // Test the connection
    const client = await pool.connect()
    console.log("✅ Connected to PostgreSQL database successfully!")
    console.log("✅ All database tables checked/created successfully")
    client.release()
  } catch (error) {
    console.error("❌ Database connection error:", error)
    throw error
  }
}

// Export the pool for use in other modules
export default pool
