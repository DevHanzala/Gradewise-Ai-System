import {
  createAssessment,
  getAssessmentsByInstructor,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  storeQuestionBlocks,
} from "../models/assessmentModel.js"
import { linkResourceToAssessment } from "../models/resourceModel.js" // For linking selected resources
import { uploadResource } from "../controllers/resourceController.js" // To handle new file uploads/chunking

/**
 * Create a new assessment
 * @route POST /api/assessments
 */
export const createNewAssessment = async (req, res) => {
  try {
    const {
      title,
      prompt,
      externalLinks,
      question_blocks,
      selected_resources = [],
    } = req.body
    const instructor_id = req.user.id
    const new_files = req.files?.new_files || [] // From multer.array('new_files')

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      })
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "AI prompt is required",
      })
    }

    if (!Array.isArray(question_blocks) || question_blocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one question block is required",
      })
    }

    // Create assessment data object
    const assessmentData = {
      title,
      prompt,
      external_links: externalLinks, // Array
      instructor_id,
      is_executed: false, // Initial false
    }

    console.log("📝 Creating assessment with data:", assessmentData)

    const newAssessment = await createAssessment(assessmentData)

    // Store question blocks
    await storeQuestionBlocks(newAssessment.id, question_blocks, instructor_id)

    // Handle new files: Upload and chunk if PDF
    let newResourceIds = []
    if (new_files.length > 0) {
      const uploadedResources = await uploadResource({ files: new_files }) // Assuming adapted to handle multiple
      newResourceIds = uploadedResources.map(r => r.id)
    }

    // Link selected + new resources
    const allResources = [...selected_resources, ...newResourceIds]
    for (const resourceId of allResources) {
      await linkResourceToAssessment(newAssessment.id, resourceId)
    }

    console.log("✅ Assessment created successfully:", newAssessment.id)

    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      data: newAssessment,
    })
  } catch (error) {
    console.error("❌ Create assessment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create assessment",
      error: error.message,
    })
  }
}

/**
 * Get all assessments for an instructor
 * @route GET /api/assessments/instructor
 */
export const getInstructorAssessments = async (req, res) => {
  try {
    const instructor_id = req.user.id
    console.log(`📋 Fetching assessments for instructor: ${instructor_id}`)

    const assessments = await getAssessmentsByInstructor(instructor_id)

    res.status(200).json({
      success: true,
      message: "Assessments retrieved successfully",
      data: assessments || [],
    })
  } catch (error) {
    console.error("❌ Get instructor assessments error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve assessments",
      error: error.message,
    })
  }
}

/**
 * Get a specific assessment by ID
 * @route GET /api/assessments/:id
 */
export const getAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const user_id = req.user.id
    const user_role = req.user.role

    console.log(`📋 Fetching assessment ${assessment_id} for user ${user_id} (${user_role})`)

    const assessment = await getAssessmentById(assessment_id, user_id, user_role)

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" })
    }

    res.status(200).json({
      success: true,
      message: "Assessment retrieved successfully",
      data: assessment,
    })
  } catch (error) {
    console.error("❌ Get assessment error:", error)
    res.status(500).json({ success: false, message: "Failed to retrieve assessment", error: error.message })
  }
}

/**
 * Update an existing assessment
 * @route PUT /api/assessments/:id
 */
export const updateExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id
    const {
      title,
      prompt,
      externalLinks,
      question_blocks,
      selected_resources = [],
    } = req.body
    const new_files = req.files?.new_files || []

    // Check if assessment exists and belongs to instructor
    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to update it" })
    }

    if (existingAssessment.is_executed) {
      return res.status(403).json({ message: "Cannot update executed assessment" })
    }

    // Update data
    const updateData = {
      title,
      prompt,
      external_links: externalLinks,
    }

    const updatedAssessment = await updateAssessment(assessment_id, updateData)

    // Update question blocks
    await storeQuestionBlocks(assessment_id, question_blocks, instructor_id)

    // Handle new files
    let newResourceIds = []
    if (new_files.length > 0) {
      const uploadedResources = await uploadResource({ files: new_files })
      newResourceIds = uploadedResources.map(r => r.id)
    }

    // Update linked resources (clear existing and add new/selected)
    // Assume function to clearLinksForAssessment(assessment_id)
    await clearLinksForAssessment(assessment_id) // Add this function in model
    const allResources = [...selected_resources, ...newResourceIds]
    for (const resourceId of allResources) {
      await linkResourceToAssessment(assessment_id, resourceId)
    }

    res.status(200).json({
      message: "Assessment updated successfully",
      assessment: updatedAssessment,
    })
  } catch (error) {
    console.error("❌ Update assessment error:", error)
    res.status(500).json({ message: "Failed to update assessment", error: error.message })
  }
}

/**
 * Delete an assessment
 * @route DELETE /api/assessments/:id
 */
export const deleteExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id

    // Check if assessment exists and belongs to instructor
    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to delete it" })
    }

    if (existingAssessment.is_executed) {
      return res.status(403).json({ message: "Cannot delete executed assessment" })
    }

    await deleteAssessment(assessment_id)

    res.status(200).json({
      message: "Assessment deleted successfully",
    })
  } catch (error) {
    console.error("❌ Delete assessment error:", error)
    res.status(500).json({ message: "Failed to delete assessment", error: error.message })
  }
}

/**
 * Publish/Unpublish an assessment
 * @route PATCH /api/assessments/:id/publish
 */
export const toggleAssessmentPublish = async (req, res) => {
  try {
    const assessment_id = Number.parseInt(req.params.id)
    const instructor_id = req.user.id
    const { is_published } = req.body

    console.log(`📢 Toggling assessment ${assessment_id} publish status to: ${is_published}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it",
      })
    }

    if (assessment.is_executed && is_published) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish executed assessment",
      })
    }

    // Update publish status
    const result = await db.query(
      "UPDATE assessments SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [is_published, assessment_id],
    )

    if (result.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update assessment publish status",
      })
    }

    console.log(`✅ Assessment ${assessment_id} publish status updated to: ${is_published}`)

    res.status(200).json({
      success: true,
      message: `Assessment ${is_published ? "published" : "unpublished"} successfully`,
      data: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Toggle assessment publish error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to toggle assessment publish status",
      error: error.message,
    })
  }
}