import {
  createResource,
  findResourcesByUploader,
  findResourceById,
  updateResource,
  deleteResource,
  getPublicResources,
  linkResourceToAssessment,
  getAssessmentResources,
  unlinkResourceFromAssessment,
} from "../models/resourceModel.js"
import { getAssessmentById as findAssessmentById } from "../models/assessmentModel.js"

import fs from "fs"
import path from "path"

/**
 * Uploads a new resource (file or link).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const uploadResource = async (req, res) => {
  const { name, url, visibility } = req.body
  const uploadedBy = req.user.id
  const file = req.file

  try {
    console.log(`🔄 Uploading resource by user ${uploadedBy}`)

    let resourceData = {
      uploadedBy,
      visibility: visibility || 'private'
    }

    if (file) {
      // File upload
      resourceData = {
        ...resourceData,
        name: name || file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        contentType: 'file'
      }
    } else if (url) {
      // Link upload
      if (!name) {
        return res.status(400).json({ message: "Name is required for link resources." })
      }
      
      resourceData = {
        ...resourceData,
        name,
        url,
        contentType: 'link'
      }
    } else {
      return res.status(400).json({ message: "Either file or URL is required." })
    }

    const newResource = await createResource(resourceData)
    console.log(`✅ Resource uploaded successfully:`, newResource)

    res.status(201).json({
      message: "Resource uploaded successfully.",
      resource: newResource,
    })
  } catch (error) {
    console.error("❌ Upload resource error:", error)
    
    // Clean up uploaded file if there was an error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
    
    res.status(500).json({ message: "Server error while uploading resource." })
  }
}

/**
 * Gets resources uploaded by the authenticated instructor.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getInstructorResources = async (req, res) => {
  const uploadedBy = req.user.id
  const { visibility } = req.query

  try {
    console.log(`🔄 Fetching resources for instructor ${uploadedBy}`)

    const resources = await findResourcesByUploader(uploadedBy, visibility)
    console.log(`✅ Found ${resources.length} resources for instructor`)

    res.status(200).json({
      resources,
    })
  } catch (error) {
    console.error("❌ Get instructor resources error:", error)
    res.status(500).json({ message: "Server error while fetching resources." })
  }
}

/**
 * Gets a specific resource by ID.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getResourceById = async (req, res) => {
  const { resourceId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching resource ${resourceId} for user ${userId}`)

    const resource = await findResourceById(resourceId)
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." })
    }

    // Authorization check
    if (userRole === "instructor" && resource.uploaded_by !== userId) {
      return res.status(403).json({ message: "You can only view your own resources." })
    }

    console.log(`✅ Resource found:`, resource)

    res.status(200).json({
      resource,
    })
  } catch (error) {
    console.error("❌ Get resource by ID error:", error)
    res.status(500).json({ message: "Server error while fetching resource." })
  }
}

/**
 * Updates a resource.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const updateResourceController = async (req, res) => {
  const { resourceId } = req.params
  const updateData = req.body
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Updating resource ${resourceId} by user ${userId}`)

    // Check if resource exists and belongs to the user (for instructors)
    const resource = await findResourceById(resourceId)
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." })
    }

    if (userRole === "instructor" && resource.uploaded_by !== userId) {
      return res.status(403).json({ message: "You can only update your own resources." })
    }

    // Update the resource
    const updatedResource = await updateResource(resourceId, updateData)
    console.log(`✅ Resource updated successfully:`, updatedResource)

    res.status(200).json({
      message: "Resource updated successfully.",
      resource: updatedResource,
    })
  } catch (error) {
    console.error("❌ Update resource error:", error)
    res.status(500).json({ message: "Server error while updating resource." })
  }
}

/**
 * Deletes a resource.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const deleteResourceController = async (req, res) => {
  const { resourceId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Deleting resource ${resourceId} by user ${userId}`)

    // Check if resource exists and belongs to the user (for instructors)
    const resource = await findResourceById(resourceId)
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." })
    }

    if (userRole === "instructor" && resource.uploaded_by !== userId) {
      return res.status(403).json({ message: "You can only delete your own resources." })
    }

    // Delete the resource
    const deletedResource = await deleteResource(resourceId)
    
    // Delete the physical file if it exists
    if (deletedResource.file_path && fs.existsSync(deletedResource.file_path)) {
      fs.unlinkSync(deletedResource.file_path)
    }
    
    console.log(`✅ Resource deleted successfully:`, deletedResource)

    res.status(200).json({
      message: "Resource deleted successfully.",
      resource: deletedResource,
    })
  } catch (error) {
    console.error("❌ Delete resource error:", error)
    res.status(500).json({ message: "Server error while deleting resource." })
  }
}

/**
 * Gets all public resources.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getPublicResourcesController = async (req, res) => {
  try {
    console.log(`🔄 Fetching public resources`)

    const resources = await getPublicResources()
    console.log(`✅ Found ${resources.length} public resources`)

    res.status(200).json({
      resources,
    })
  } catch (error) {
    console.error("❌ Get public resources error:", error)
    res.status(500).json({ message: "Server error while fetching public resources." })
  }
}

/**
 * Links a resource to an assessment.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const linkResourceToAssessmentController = async (req, res) => {
  const { resourceId, assessmentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Linking resource ${resourceId} to assessment ${assessmentId}`)

    // Check if assessment exists
    const assessment = await findAssessmentById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." })
    }

    // Authorization check
    if (userRole === "instructor" && assessment.created_by !== userId) {
      return res.status(403).json({ message: "You can only link resources to your own assessments." })
    }

    // Check if resource exists
    const resource = await findResourceById(resourceId)
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." })
    }

    // Link the resource to the assessment
    const link = await linkResourceToAssessment(assessmentId, resourceId)
    console.log(`✅ Resource linked successfully:`, link)

    res.status(201).json({
      message: "Resource linked to assessment successfully.",
      link,
    })
  } catch (error) {
    console.error("❌ Link resource error:", error)
    res.status(500).json({ message: "Server error while linking resource." })
  }
}

/**
 * Gets resources linked to an assessment.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAssessmentResourcesController = async (req, res) => {
  const { assessmentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching resources for assessment ${assessmentId}`)

    // Check if assessment exists
    const assessment = await findAssessmentById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." })
    }

    // Authorization check
    if (userRole === "instructor" && assessment.created_by !== userId) {
      return res.status(403).json({ message: "You can only view resources for your own assessments." })
    }

    // Get linked resources
    const resources = await getAssessmentResources(assessmentId)
    console.log(`✅ Found ${resources.length} linked resources`)

    res.status(200).json({
      resources,
      assessment: {
        id: assessment.id,
        name: assessment.name,
        creator_name: assessment.creator_name,
      },
    })
  } catch (error) {
    console.error("❌ Get assessment resources error:", error)
    res.status(500).json({ message: "Server error while fetching assessment resources." })
  }
}

/**
 * Unlinks a resource from an assessment.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const unlinkResourceFromAssessmentController = async (req, res) => {
  const { resourceId, assessmentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Unlinking resource ${resourceId} from assessment ${assessmentId}`)

    // Check if assessment exists
    const assessment = await findAssessmentById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." })
    }

    // Authorization check
    if (userRole === "instructor" && assessment.created_by !== userId) {
      return res.status(403).json({ message: "You can only manage resources for your own assessments." })
    }

    // Unlink the resource from the assessment
    const unlink = await unlinkResourceFromAssessment(assessmentId, resourceId)
    console.log(`✅ Resource unlinked successfully:`, unlink)

    res.status(200).json({
      message: "Resource unlinked from assessment successfully.",
      unlink,
    })
  } catch (error) {
    console.error("❌ Unlink resource error:", error)
    res.status(500).json({ message: "Server error while unlinking resource." })
  }
}
