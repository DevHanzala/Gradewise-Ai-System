import { fixAssessmentAttemptsTable } from "./fixAssessmentAttemptsTable.js"

console.log("🚀 Starting migration to fix assessment_attempts table...")

fixAssessmentAttemptsTable()
  .then(() => {
    console.log("✅ Migration completed successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  })
