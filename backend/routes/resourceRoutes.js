import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import {
  uploadResource,
  getInstructorResources,
  getResourceById,
  updateResourceController,
  deleteResourceController,
  getPublicResourcesController,
  linkResourceToAssessmentController,
  getAssessmentResourcesController,
  unlinkResourceFromAssessmentController,
} from "../controllers/resourceController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = express.Router()

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads"
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, DOCX, TXT, and CSV files are allowed."), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Resource CRUD routes

/**
 * @route   POST /api/resources/upload
 * @desc    Upload a new resource file
 * @access  Private (Instructor, Admin, Super Admin)
 */
router.post(
  "/upload",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  upload.single("file"),
  uploadResource
)

/**
 * @route   POST /api/resources/link
 * @desc    Add a new resource link (URL)
 * @access  Private (Instructor, Admin, Super Admin)
 */
router.post(
  "/link",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  uploadResource
)

/**
 * @route   GET /api/resources/instructor
 * @desc    Get resources uploaded by the authenticated instructor
 * @access  Private (Instructor)
 */
router.get(
  "/instructor",
  protect,
  authorizeRoles(["instructor"]),
  getInstructorResources
)

/**
 * @route   GET /api/resources/public
 * @desc    Get all public resources
 * @access  Private (All authenticated users)
 */
router.get(
  "/public",
  protect,
  getPublicResourcesController
)

/**
 * @route   GET /api/resources/:resourceId
 * @desc    Get a specific resource by ID
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.get(
  "/:resourceId",
  protect,
  getResourceById
)

/**
 * @route   PUT /api/resources/:resourceId
 * @desc    Update a resource
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.put(
  "/:resourceId",
  protect,
  updateResourceController
)

/**
 * @route   DELETE /api/resources/:resourceId
 * @desc    Delete a resource
 * @access  Private (Resource owner, Admin, Super Admin)
 */
router.delete(
  "/:resourceId",
  protect,
  deleteResourceController
)

// Assessment-Resource linking routes

/**
 * @route   POST /api/resources/:resourceId/link/:assessmentId
 * @desc    Link a resource to an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.post(
  "/:resourceId/link/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  linkResourceToAssessmentController
)

/**
 * @route   GET /api/resources/assessment/:assessmentId
 * @desc    Get resources linked to an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.get(
  "/assessment/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  getAssessmentResourcesController
)

/**
 * @route   DELETE /api/resources/:resourceId/unlink/:assessmentId
 * @desc    Unlink a resource from an assessment
 * @access  Private (Assessment owner, Admin, Super Admin)
 */
router.delete(
  "/:resourceId/unlink/:assessmentId",
  protect,
  authorizeRoles(["instructor", "admin", "super_admin"]),
  unlinkResourceFromAssessmentController
)

export default router
