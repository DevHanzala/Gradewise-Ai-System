import {
  getInstructorExecutedAssessmentsModel,
  getAssessmentStudentsModel
} from "../models/InstructorAssessmentAnalyticsModel.js";
import db from "../DB/db.js";

/**
 * Instructor Assessment Analytics Controller
 */

/**
 * Retrieve instructor's executed assessments
 * @route GET /api/instructor-analytics/assessments
 */
export const getInstructorExecutedAssessments = async (req, res) => {
  try {
    const instructorId = req.user?.id;
    if (!instructorId || req.user.role !== "instructor") {
      return res.status(403).json({
        success: false,
        message: "Only instructors can access their assessments"
      });
    }

    console.log(`📋 Getting executed assessments for instructor ${instructorId}`);
    const assessments = await getInstructorExecutedAssessmentsModel(instructorId);

    if (!assessments || assessments.length === 0) {
      console.log(`ℹ️ No executed assessments found for instructor ${instructorId}`);
      return res.status(200).json({
        success: true,
        message: "No executed assessments found",
        data: []
      });
    }

    console.log(`✅ Retrieved ${assessments.length} executed assessments`);
    res.status(200).json({
      success: true,
      message: "Executed assessments retrieved successfully",
      data: assessments
    });
  } catch (error) {
    console.error("❌ Error fetching executed assessments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch executed assessments",
      error: error.message
    });
  }
};

/**
 * Get students who completed a specific assessment
 * @route GET /api/instructor-analytics/assessment/:id/students
 */
export const getAssessmentStudents = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const instructorId = req.user?.id;

    if (!instructorId || req.user.role !== "instructor") {
      return res.status(403).json({
        success: false,
        message: "Only instructors can access student data"
      });
    }

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assessment ID"
      });
    }

    console.log(`📋 Getting students for assessment ${assessmentId}`);
    const students = await getAssessmentStudentsModel(assessmentId, instructorId);

    if (!students || students.length === 0) {
      console.log(`ℹ️ No students found for assessment ${assessmentId}`);
      return res.status(200).json({
        success: true,
        message: "No students found for this assessment",
        data: []
      });
    }

    console.log(`✅ Retrieved ${students.length} students for assessment ${assessmentId}`);
    res.status(200).json({
      success: true,
      message: "Students retrieved successfully",
      data: students
    });
  } catch (error) {
    console.error("❌ Error fetching assessment students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assessment students",
      error: error.message
    });
  }
};