import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  uploadResource,
  getInstructorResources,
  getAllResources,
  getResourceById,
  updateResourceController,
  deleteResourceController,
  linkResourceToAssessmentController,
  getAssessmentResourcesController,
  unlinkResourceFromAssessmentController,
} from "../controllers/resourceController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads/assessments";
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`✅ Uploads directory ensured at: ${uploadsDir}`);
  } catch (error) {
    console.error("❌ Error creating uploads directory:", error);
  }
};
ensureUploadsDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
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

/**
 * @route   POST /api/resources
 * @desc    Upload a new resource file or URL
 * @access  Private (Instructor, Admin, Super Admin)
 */
router.post(
  "/",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  upload.array("files", 10),
  uploadResource
);

/**
 * @route   GET /api/resources
 * @desc    Get resources uploaded by the authenticated instructor
 * @access  Private (Instructor, Admin, Super Admin)
 */
router.get(
  "/",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getInstructorResources
);

/**
 * @route   GET /api/resources/all
 * @desc    Get all file-based resources in the system
 * @access  Private (Instructor, Admin, Super Admin)
 */
router.get(
  "/all",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getAllResources
);

/**
 * @route   GET /api/resources/:resourceId
 * @desc    Get a specific resource by ID
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.get(
  "/:resourceId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getResourceById
);

/**
 * @route   PUT /api/resources/:resourceId
 * @desc    Update a resource
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.put(
  "/:resourceId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  updateResourceController
);

/**
 * @route   DELETE /api/resources/:resourceId
 * @desc    Delete a resource
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.delete(
  "/:resourceId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  deleteResourceController
);

/**
 * @route   POST /api/resources/:resourceId/assessments/:assessmentId
 * @desc    Link a resource to an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.post(
  "/:resourceId/assessments/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  linkResourceToAssessmentController
);

/**
 * @route   GET /api/resources/assessments/:assessmentId
 * @desc    Get resources linked to an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.get(
  "/assessments/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getAssessmentResourcesController
);

/**
 * @route   DELETE /api/resources/:resourceId/assessments/:assessmentId
 * @desc    Unlink a resource from an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.delete(
  "/:resourceId/assessments/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  unlinkResourceFromAssessmentController
);

export default router;