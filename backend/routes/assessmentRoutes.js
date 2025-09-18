import express from "express";
import multer from "multer";
import path from "path";
import {
  createAssessment,
  storeQuestionBlocks,
  getAssessmentsByInstructor,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  clearLinksForAssessment,
  storeResourceChunk,
} from "../models/assessmentModel.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { createResource, linkResourceToAssessment } from "../models/resourceModel.js";
import { extractTextFromFile, chunkText } from "../services/textProcessor.js";
import { generateEmbedding } from "../services/embeddingGenerator.js";
import {
  enrollStudentController,
  unenrollStudentController,
  getEnrolledStudentsController,
} from "../controllers/assessmentController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads/assessments/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, DOCX, TXT files are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const createAssessmentHandler = async (req, res) => {
  try {
    const { title, prompt, externalLinks = [], question_blocks = [], selected_resources = [] } = req.body;
    const instructor_id = req.user.id;
    const files = req.files || [];

    console.log(`🔄 Creating assessment for instructor ${instructor_id}`, { title, prompt, externalLinks, question_blocks, selected_resources, files: files.map(f => f.originalname) });

    if (!title || !prompt) {
      return res.status(400).json({ success: false, message: "Title and prompt are required" });
    }

    let parsedExternalLinks;
    try {
      parsedExternalLinks = Array.isArray(externalLinks)
        ? externalLinks.filter(link => link && typeof link === "string" && link.trim() !== "")
        : typeof externalLinks === "string" && externalLinks.trim() !== ""
          ? JSON.parse(externalLinks).filter(link => link && typeof link === "string" && link.trim() !== "")
          : [];
    } catch (error) {
      console.warn(`⚠️ Failed to parse externalLinks: ${externalLinks}`, error);
      parsedExternalLinks = [];
    }
    console.log(`🔍 Parsed externalLinks:`, parsedExternalLinks);

    let parsedQuestionBlocks = Array.isArray(question_blocks) ? question_blocks : JSON.parse(question_blocks || "[]");
    let parsedSelectedResources = Array.isArray(selected_resources) ? selected_resources.filter(id => id && !isNaN(parseInt(id))) : JSON.parse(selected_resources || "[]").filter(id => id && !isNaN(parseInt(id)));

    if (parsedQuestionBlocks.length > 0) {
      for (const block of parsedQuestionBlocks) {
        if (!block.question_type || block.question_type.trim() === "" || typeof block.question_type !== "string") {
          return res.status(400).json({ success: false, message: "Each question block must have a valid non-empty question_type" });
        }
        if (!block.question_count || block.question_count < 1) {
          return res.status(400).json({ success: false, message: "Each question block must have a valid question_count >= 1" });
        }
      }
    }

    const assessmentData = {
      title,
      prompt,
      external_links: parsedExternalLinks,
      instructor_id,
      is_executed: false,
    };
    const newAssessment = await createAssessment(assessmentData);

    if (parsedQuestionBlocks.length > 0) {
      await storeQuestionBlocks(newAssessment.id, parsedQuestionBlocks, instructor_id);
    }

    const uploadedResources = [];
    for (const file of files) {
      const resourceData = {
        name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        content_type: "file",
        visibility: "private",
        uploaded_by: instructor_id,
      };
      const resource = await createResource(resourceData);

      const text = await extractTextFromFile(file.path, file.mimetype);
      const chunks = chunkText(text, 500);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        await storeResourceChunk(resource.id, chunk, embedding, { chunk_index: i });
      }

      uploadedResources.push(resource.id);
      await linkResourceToAssessment(newAssessment.id, resource.id);
    }

    console.log(`🔍 Parsed selected_resources:`, parsedSelectedResources);
    for (const resourceId of parsedSelectedResources) {
      if (resourceId && !isNaN(parseInt(resourceId))) {
        await linkResourceToAssessment(newAssessment.id, parseInt(resourceId));
      } else {
        console.warn(`⚠️ Skipping invalid resourceId: ${resourceId}`);
      }
    }

    console.log(`✅ Assessment created: ID=${newAssessment.id}`);
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

router.get(
  "/instructor",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  async (req, res) => {
    try {
      const instructor_id = req.user.id;
      console.log(`🔄 Fetching assessments for instructor ${instructor_id}`);
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
  }
);

router.get(
  "/:id",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  async (req, res) => {
    try {
      const assessment_id = req.params.id;
      const user_id = req.user.id;
      const user_role = req.user.role;

      if (!assessment_id || isNaN(parseInt(assessment_id))) {
        return res.status(400).json({ success: false, message: "Invalid assessment ID" });
      }

      console.log(`🔄 Fetching assessment ${assessment_id} for user ${user_id} (${user_role})`);

      const assessment = await getAssessmentById(parseInt(assessment_id), user_id, user_role);

      if (!assessment) {
        return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
      }

      res.status(200).json({
        success: true,
        message: "Assessment retrieved successfully",
        data: assessment,
      });
    } catch (error) {
      console.error("❌ Get assessment by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve assessment",
        error: error.message,
      });
    }
  }
);

router.post(
  "/",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  upload.array("new_files", 10),
  createAssessmentHandler
);

router.post(
  "/generate-prompt",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  upload.array("new_files", 10),
  async (req, res) => {
    req.body = { ...req.body, externalLinks: req.body.externalLinks || [], question_blocks: req.body.question_blocks || [], selected_resources: req.body.selected_resources || [] };
    return createAssessmentHandler(req, res);
  }
);

router.put(
  "/:id",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  upload.array("new_files", 10),
  async (req, res) => {
    try {
      const assessment_id = req.params.id;
      const user_id = req.user.id;
      const user_role = req.user.role;

      if (!assessment_id || isNaN(parseInt(assessment_id))) {
        return res.status(400).json({ success: false, message: "Invalid assessment ID" });
      }

      console.log(`🔄 Updating assessment ${assessment_id} for user ${user_id} (${user_role})`, { title: req.body.title, prompt: req.body.prompt });

      const assessment = await getAssessmentById(parseInt(assessment_id), user_id, user_role);
      if (!assessment) {
        return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
      }

      if (assessment.is_executed) {
        return res.status(400).json({ success: false, message: "Cannot update an executed assessment" });
      }

      const { title, prompt, externalLinks = [], question_blocks = [], selected_resources = [] } = req.body;
      const files = req.files || [];

      let parsedExternalLinks;
      try {
        parsedExternalLinks = Array.isArray(externalLinks)
          ? externalLinks.filter(link => link && typeof link === "string" && link.trim() !== "")
          : typeof externalLinks === "string" && externalLinks.trim() !== ""
            ? JSON.parse(externalLinks).filter(link => link && typeof link === "string" && link.trim() !== "")
            : [];
      } catch (error) {
        console.warn(`⚠️ Failed to parse externalLinks: ${externalLinks}`, error);
        parsedExternalLinks = [];
      }
      console.log(`🔍 Parsed externalLinks:`, parsedExternalLinks);

      let parsedQuestionBlocks = Array.isArray(question_blocks) ? question_blocks : JSON.parse(question_blocks || "[]");
      let parsedSelectedResources = Array.isArray(selected_resources)
        ? selected_resources.filter(id => id && !isNaN(parseInt(id)) && id !== "null")
        : JSON.parse(selected_resources || "[]").filter(id => id && !isNaN(parseInt(id)) && id !== "null");

      if (parsedQuestionBlocks.length > 0) {
        for (const block of parsedQuestionBlocks) {
          if (!block.question_type || block.question_type.trim() === "" || typeof block.question_type !== "string") {
            return res.status(400).json({ success: false, message: "Each question block must have a valid non-empty question_type" });
          }
          if (!block.question_count || block.question_count < 1) {
            return res.status(400).json({ success: false, message: "Each question block must have a valid question_count >= 1" });
          }
        }
      }

      const updateData = {
        title,
        prompt,
        external_links: parsedExternalLinks,
      };
      const updatedAssessment = await updateAssessment(parseInt(assessment_id), updateData);

      await clearLinksForAssessment(parseInt(assessment_id));
      if (parsedQuestionBlocks.length > 0) {
        await storeQuestionBlocks(parseInt(assessment_id), parsedQuestionBlocks, user_id);
      } else {
        await storeQuestionBlocks(parseInt(assessment_id), [], user_id);
      }

      const uploadedResources = [];
      for (const file of files) {
        const resourceData = {
          name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size,
          content_type: "file",
          visibility: "private",
          uploaded_by: user_id,
        };
        const resource = await createResource(resourceData);

        const text = await extractTextFromFile(file.path, file.mimetype);
        const chunks = chunkText(text, 500);
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await generateEmbedding(chunk);
          await storeResourceChunk(resource.id, chunk, embedding, { chunk_index: i });
        }

        uploadedResources.push(resource.id);
        await linkResourceToAssessment(parseInt(assessment_id), resource.id);
      }

      console.log(`🔍 Parsed selected_resources:`, parsedSelectedResources);
      for (const resourceId of parsedSelectedResources) {
        if (resourceId && !isNaN(parseInt(resourceId)) && resourceId !== "null") {
          await linkResourceToAssessment(parseInt(assessment_id), parseInt(resourceId));
        } else {
          console.warn(`⚠️ Skipping invalid resourceId: ${resourceId}`);
        }
      }

      console.log(`✅ Assessment updated: ID=${assessment_id}`);
      res.status(200).json({
        success: true,
        message: "Assessment updated successfully",
        data: updatedAssessment,
      });
    } catch (error) {
      console.error("❌ Update assessment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update assessment",
        error: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  async (req, res) => {
    try {
      const assessment_id = req.params.id;
      const user_id = req.user.id;
      const user_role = req.user.role;

      if (!assessment_id || isNaN(parseInt(assessment_id))) {
        return res.status(400).json({ success: false, message: "Invalid assessment ID" });
      }

      console.log(`🔄 Deleting assessment ${assessment_id} for user ${user_id} (${user_role})`);

      const assessment = await getAssessmentById(parseInt(assessment_id), user_id, user_role);
      if (!assessment) {
        return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
      }

      const deleted = await deleteAssessment(parseInt(assessment_id));
      if (deleted) {
        console.log(`✅ Assessment deleted: ID=${assessment_id}`);
        res.status(200).json({
          success: true,
          message: "Assessment deleted successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }
    } catch (error) {
      console.error("❌ Delete assessment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete assessment",
        error: error.message,
      });
    }
  }
);

router.post(
  "/:assessmentId/enroll",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  enrollStudentController
);

router.delete(
  "/:assessmentId/unenroll/:studentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  unenrollStudentController
);

router.get(
  "/:assessmentId/students",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getEnrolledStudentsController
);

export default router;