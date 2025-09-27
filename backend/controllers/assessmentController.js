import { createAssessment, getAssessmentsByInstructor, getAssessmentById, updateAssessment, deleteAssessment, storeQuestionBlocks, enrollStudent, unenrollStudent, getEnrolledStudents, clearLinksForAssessment, generateAssessmentQuestions } from "../models/assessmentModel.js";
import { findUserByEmail } from "../models/userModel.js";
import { linkResourceToAssessment } from "../models/resourceModel.js"; 
import { uploadResource } from "../controllers/resourceController.js";
import { sendAssessmentEnrollmentEmail } from "../services/emailService.js";
import pool from "../DB/db.js";

export const createNewAssessment = async (req, res) => {
  try {
    const {
      title,
      prompt,
      externalLinks,
      question_blocks,
      selected_resources = [],
    } = req.body;
    const instructor_id = req.user.id;
    const new_files = req.files?.new_files || [];

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "AI prompt is required",
      });
    }

    if (!Array.isArray(question_blocks) || question_blocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one question block is required",
      });
    }

    const assessmentData = {
      title,
      prompt,
      external_links: externalLinks,
      instructor_id,
      is_executed: false,
    };

    console.log("📝 Creating assessment with data:", assessmentData);

    const newAssessment = await createAssessment(assessmentData);

    await storeQuestionBlocks(newAssessment.id, question_blocks, instructor_id);

    let newResourceIds = [];
    if (new_files.length > 0) {
      const uploadedResources = await uploadResource({ files: new_files });
      newResourceIds = uploadedResources.map(r => r.id);
    }

    const allResources = [...selected_resources, ...newResourceIds];
    for (const resourceId of allResources) {
      await linkResourceToAssessment(newAssessment.id, resourceId);
    }

    console.log("✅ Assessment created successfully:", newAssessment.id);

    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      data: newAssessment,
    });
  } catch (error) {
    console.error("❌ Create assessment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create assessment",
      error: error.message,
    });
  }
};

export const getInstructorAssessments = async (req, res) => {
  try {
    const instructor_id = req.user.id;
    console.log(`📋 Fetching assessments for instructor: ${instructor_id}`);

    const assessments = await getAssessmentsByInstructor(instructor_id);

    res.status(200).json({
      success: true,
      message: "Assessments retrieved successfully",
      data: assessments || [],
    });
  } catch (error) {
    console.error("❌ Get instructor assessments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve assessments",
      error: error.message,
    });
  }
};

export const getAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const user_id = req.user.id;
    const user_role = req.user.role;

    console.log(`📋 Fetching assessment ${assessment_id} for user ${user_id} (${user_role})`);

    const assessment = await getAssessmentById(assessment_id, user_id, user_role);

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    res.status(200).json({
      success: true,
      message: "Assessment retrieved successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("❌ Get assessment error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve assessment", error: error.message });
  }
};

export const updateExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const instructor_id = req.user.id;
    const {
      title,
      prompt,
      externalLinks,
      question_blocks,
      selected_resources = [],
    } = req.body;
    const new_files = req.files?.new_files || [];

    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor");

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to update it" });
    }

    if (existingAssessment.is_executed) {
      return res.status(403).json({ message: "Cannot update executed assessment" });
    }

    const updateData = {
      title,
      prompt,
      external_links: externalLinks,
    };

    const updatedAssessment = await updateAssessment(assessment_id, updateData);

    await storeQuestionBlocks(assessment_id, question_blocks, instructor_id);

    await clearLinksForAssessment(assessment_id);
    let newResourceIds = [];
    if (new_files.length > 0) {
      const uploadedResources = await uploadResource({ files: new_files });
      newResourceIds = uploadedResources.map(r => r.id);
    }
    const allResources = [...selected_resources, ...newResourceIds];
    for (const resourceId of allResources) {
      await linkResourceToAssessment(assessment_id, resourceId);
    }

    res.status(200).json({
      message: "Assessment updated successfully",
      assessment: updatedAssessment,
    });
  } catch (error) {
    console.error("❌ Update assessment error:", error);
    res.status(500).json({ message: "Failed to update assessment", error: error.message });
  }
};

export const deleteExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const instructor_id = req.user.id;

    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor");

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to delete it" });
    }

    if (existingAssessment.is_executed) {
      return res.status(403).json({ message: "Cannot delete executed assessment" });
    }

    await deleteAssessment(assessment_id);

    res.status(200).json({
      message: "Assessment deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete assessment error:", error);
    res.status(500).json({ message: "Failed to delete assessment", error: error.message });
  }
};

export const toggleAssessmentPublish = async (req, res) => {
  try {
    const assessment_id = Number.parseInt(req.params.id);
    const instructor_id = req.user.id;
    const { is_published } = req.body;

    console.log(`📢 Toggling assessment ${assessment_id} publish status to: ${is_published}`);

    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor");

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it",
      });
    }

    if (assessment.is_executed && is_published) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish executed assessment",
      });
    }

    const result = await pool.query(
      "UPDATE assessments SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [is_published, assessment_id]
    );

    if (result.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update assessment publish status",
      });
    }

    console.log(`✅ Assessment ${assessment_id} publish status updated to: ${is_published}`);

    res.status(200).json({
      success: true,
      message: `Assessment ${is_published ? "published" : "unpublished"} successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Toggle assessment publish error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle assessment publish status",
      error: error.message,
    });
  }
};

export const enrollStudentController = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Enrolling student with email ${email} to assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const student = await findUserByEmail(email);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ success: false, message: "User is not a student" });
    }

    const enrollment = await enrollStudent(assessmentId, student.id);

    // Default dueDate to 7 days from now since assessments table lacks due_date
    const dueDate = assessment.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sendAssessmentEnrollmentEmail(student.email, student.name, assessment.title, dueDate);

    res.status(200).json({
      success: true,
      message: "Student enrolled successfully",
      data: enrollment,
    });
  } catch (error) {
    console.error("❌ Enroll student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enroll student",
      error: error.message,
    });
  }
};

export const unenrollStudentController = async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Unenrolling student ${studentId} from assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const enrollment = await unenrollStudent(assessmentId, studentId);

    res.status(200).json({
      success: true,
      message: "Student unenrolled successfully",
      data: enrollment,
    });
  } catch (error) {
    console.error("❌ Unenroll student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unenroll student",
      error: error.message,
    });
  }
};

export const getEnrolledStudentsController = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Fetching enrolled students for assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const students = await getEnrolledStudents(assessmentId);

    res.status(200).json({
      success: true,
      message: "Enrolled students retrieved successfully",
      data: students,
    });
  } catch (error) {
    console.error("❌ Get enrolled students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrolled students",
      error: error.message,
    });
  }
};

export const startAssessmentForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assessmentId } = req.params;
    const { language = "en" } = req.body || {};

    console.log(`📝 Starting assessment ${assessmentId} for student ${studentId} in language ${language}`);

    // Check if assessment exists
    const assessment = await getAssessmentById(assessmentId, studentId, "student");
    if (!assessment) {
      console.warn(`⚠️ Assessment ${assessmentId} not found or student ${studentId} not authorized`);
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    // Set is_executed to true if not already
    if (!assessment.is_executed) {
      console.log(`🔄 Updating is_executed to true for assessment ${assessmentId}`);
      await updateAssessment(assessmentId, { is_executed: true });
    } else {
      console.log(`ℹ️ Assessment ${assessmentId} already has is_executed = true`);
    }

    // Validate enrollment
    const { rows: enrollRows } = await pool.query(
      `SELECT 1 FROM enrollments WHERE student_id = $1 AND assessment_id = $2`,
      [studentId, assessmentId]
    );
    if (enrollRows.length === 0) {
      console.warn(`⚠️ Student ${studentId} not enrolled for assessment ${assessmentId}`);
      return res.status(403).json({ success: false, message: "You are not enrolled for this assessment" });
    }

    // Check for existing in-progress attempt
    const { rows: existingAttempt } = await pool.query(
      `SELECT id FROM assessment_attempts WHERE student_id = $1 AND assessment_id = $2 AND status = 'in_progress'`,
      [studentId, assessmentId]
    );
    if (existingAttempt.length > 0) {
      console.warn(`⚠️ In-progress attempt exists for student ${studentId}, assessment ${assessmentId}`);
      return res.status(400).json({ success: false, message: "Assessment already in progress" });
    }

    // Create attempt
    const { rows: attemptRows } = await pool.query(
      `INSERT INTO assessment_attempts (student_id, assessment_id, attempt_number, started_at, language, status)
       VALUES ($1, $2, 1, NOW(), $3, 'in_progress') RETURNING id`,
      [studentId, assessmentId, language]
    );
    const attemptId = attemptRows[0].id;
    console.log(`✅ Created attempt ${attemptId} for assessment ${assessmentId}`);

    // Generate questions via model
    const { questions, duration } = await generateAssessmentQuestions(assessmentId, attemptId, language, assessment);

    // Verify stored questions
    const { rows: dbQuestions } = await pool.query(
      `SELECT id, question_order, question_type, question_text, options::text, correct_answer, marks
       FROM generated_questions WHERE attempt_id = $1 ORDER BY question_order ASC`,
      [attemptId]
    );

    console.log(`✅ Generated ${dbQuestions.length} questions for attempt ${attemptId}`);

    res.status(200).json({
      success: true,
      message: "Assessment started successfully",
      data: { attemptId, duration, questions: dbQuestions },
    });
  } catch (error) {
    console.error("❌ startAssessmentForStudent error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to start assessment" });
  }
};