import bcrypt from "bcrypt"
import pool from "../DB/db.js"
import dotenv from "dotenv"

dotenv.config()

/**
 * Creates the first and only Super Admin user in the system.
 * This script should be run once only to bootstrap the system.
 */
const createSuperAdmin = async () => {
  try {
    console.log("🔄 Creating Super Admin...")

    // Check if Super Admin already exists
    const existingQuery = "SELECT * FROM users WHERE role = 'super_admin'"
    const { rows: existing } = await pool.query(existingQuery)

    if (existing.length > 0) {
      console.log("❌ Super Admin already exists!")
      console.log("Existing Super Admin:", {
        id: existing[0].id,
        name: existing[0].name,
        email: existing[0].email,
        role: existing[0].role,
      })
      process.exit(1)
    }

    // Super Admin details - CHANGE THESE VALUES
    const superAdminData = {
      name: "Super Administrator",
      email: "superadmin@gradewise.com", // CHANGE THIS
      password: "SuperAdmin123!", // CHANGE THIS
      role: "super_admin",
    }

    console.log("Creating Super Admin with email:", superAdminData.email)

    // Hash the password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 10)

    // Insert Super Admin into database
    const insertQuery = `
      INSERT INTO users (name, email, password, role, verified, provider) 
      VALUES ($1, $2, $3, $4, TRUE, 'manual') 
      RETURNING id, name, email, role, verified, created_at
    `

    const { rows } = await pool.query(insertQuery, [
      superAdminData.name,
      superAdminData.email,
      hashedPassword,
      superAdminData.role,
    ])

    const newSuperAdmin = rows[0]

    console.log("✅ Super Admin created successfully!")
    console.log("Super Admin Details:", {
      id: newSuperAdmin.id,
      name: newSuperAdmin.name,
      email: newSuperAdmin.email,
      role: newSuperAdmin.role,
      verified: newSuperAdmin.verified,
      created_at: newSuperAdmin.created_at,
    })

    console.log("\n🔐 Login Credentials:")
    console.log(`Email: ${superAdminData.email}`)
    console.log(`Password: ${superAdminData.password}`)
    console.log("\n⚠️  IMPORTANT: Change these credentials after first login!")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating Super Admin:", error)
    process.exit(1)
  }
}

// Run the script
createSuperAdmin()
