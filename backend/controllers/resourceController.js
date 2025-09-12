import fs from "fs/promises";
import path from "path";
import {
  createResource,
  findResourcesByUploader,
  findResourceById,
  updateResource,
  deleteResource,
  linkResourceToAssessment,
  getAssessmentResources,
  unlinkResourceFromAssessment,
  findAllResources,
} from "../models/resourceModel.js";
import { getAssessmentById, storeResourceChunk } from "../models/assessmentModel.js";
import { extractTextFromFile, chunkText } from "../services/textProcessor.js";
import { generateEmbedding } from "../services/embeddingGenerator.js";

export const uploadResource = async (req, res) => {
  const { name, url, visibility } = req.body;
  const uploadedBy = req.user.id;
  const files = req.files || [];

  try {
    console.log(`🔄 Uploading resources by user ${uploadedBy}`);

    const uploadedResources = [];

    // Handle files
    for (const file of files) {
      let resourceData = {
        name: name || file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        content_type: "file",
        visibility: visibility || "private",
        uploaded_by: uploadedBy,
      };

      const newResource = await createResource(resourceData);

      // Extract text, chunk, and generate embeddings
      const text = await extractTextFromFile(file.path, file.mimetype);
      const chunks = chunkText(text, 500);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        await storeResourceChunk(newResource.id, chunk, embedding, { chunk_index: i });
      }

      uploadedResources.push(newResource);
    }

    // Handle URL if provided
    if (url) {
      if (!name) {
        return res.status(400).json({ success: false, message: "Name is required for link resources." });
      }

      const resourceData = {
        name,
        url,
        content_type: "link",
        visibility: visibility || "private",
        uploaded_by: uploadedBy,
      };

      const newResource = await createResource(resourceData);
      uploadedResources.push(newResource);
    }

    if (uploadedResources.length === 0) {
      return res.status(400).json({ success: false, message: "No files or URL provided." });
    }

    console.log(`✅ ${uploadedResources.length} resources uploaded successfully`);

    res.status(201).json({
      success: true,
      message: "Resources uploaded successfully.",
      resources: uploadedResources,
    });
  } catch (error) {
    console.error("❌ Upload resource error:", error);

    // Clean up uploaded files on error
    for (const file of files) {
      if (file.path) {
        await fs.unlink(file.path).catch(err => console.error("❌ Error deleting file:", err));
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error while uploading resources.",
      error: error.message,
    });
  }
};

export const getInstructorResources = async (req, res) => {
  try {
    const uploadedBy = req.user.id;
    const visibility = req.query.visibility || null;

    console.log(`🔄 Fetching resources for instructor ${uploadedBy}`);

    const resources = await findResourcesByUploader(uploadedBy, visibility);

    res.status(200).json({
      success: true,
      message: "Resources retrieved successfully",
      data: resources || [],
    });
  } catch (error) {
    console.error("❌ Get instructor resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve resources",
      error: error.message,
    });
  }
};

export const getAllResources = async (req, res) => {
  try {
    console.log(`🔄 Fetching all file-based resources`);
    const resources = await findAllResources();
    res.status(200).json({
      success: true,
      message: "System resources retrieved successfully",
      data: resources || [],
    });
  } catch (error) {
    console.error("❌ Get all resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system resources",
      error: error.message,
    });
  }
};

export const getResourceById = async (req, res) => {
  try {
    const resourceId = req.params.resourceId;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Fetching resource ${resourceId} for user ${userId} (${userRole})`);

    const resource = await findResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    if (userRole === "instructor" && resource.uploaded_by !== Number.parseInt(userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      message: "Resource retrieved successfully",
      data: resource,
    });
  } catch (error) {
    console.error("❌ Get resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve resource",
      error: error.message,
    });
  }
};

export const updateResourceController = async (req, res) => {
  try {
    const resourceId = req.params.resourceId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { name, visibility } = req.body;

    console.log(`🔄 Updating resource ${resourceId} by user ${userId} (${userRole})`);

    const resource = await findResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    if (userRole === "instructor" && resource.uploaded_by !== Number.parseInt(userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updateData = { name, visibility };
    const updatedResource = await updateResource(resourceId, updateData);

    res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: updatedResource,
    });
  } catch (error) {
    console.error("❌ Update resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update resource",
      error: error.message,
    });
  }
};

export const deleteResourceController = async (req, res) => {
  try {
    const resourceId = req.params.resourceId;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Deleting resource ${resourceId} by user ${userId} (${userRole})`);

    const resource = await findResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    if (userRole === "instructor" && resource.uploaded_by !== Number.parseInt(userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Delete file from filesystem if it exists
    if (resource.file_path) {
      const filePath = path.join(process.cwd(), resource.file_path);
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(`❌ Error deleting file ${filePath}:`, err);
        } else {
          console.log(`⚠️ File not found, skipping deletion: ${filePath}`);
        }
      }
    }

    // Delete resource from database
    await deleteResource(resourceId);

    res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete resource",
      error: error.message,
    });
  }
};

export const linkResourceToAssessmentController = async (req, res) => {
  try {
    const { resourceId, assessmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Linking resource ${resourceId} to assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const resource = await findResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const link = await linkResourceToAssessment(assessmentId, resourceId);

    res.status(200).json({
      success: true,
      message: "Resource linked to assessment successfully",
      data: link,
    });
  } catch (error) {
    console.error("❌ Link resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to link resource",
      error: error.message,
    });
  }
};

export const getAssessmentResourcesController = async (req, res) => {
  try {
    const assessmentId = req.params.assessmentId;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Fetching resources for assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const resources = await getAssessmentResources(assessmentId);

    res.status(200).json({
      success: true,
      message: "Resources retrieved successfully",
      data: resources || [],
    });
  } catch (error) {
    console.error("❌ Get assessment resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve assessment resources",
      error: error.message,
    });
  }
};

export const unlinkResourceFromAssessmentController = async (req, res) => {
  try {
    const { resourceId, assessmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔄 Unlinking resource ${resourceId} from assessment ${assessmentId} by user ${userId} (${userRole})`);

    const assessment = await getAssessmentById(assessmentId, userId, userRole);

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    const resource = await findResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const result = await unlinkResourceFromAssessment(assessmentId, resourceId);

    if (!result) {
      return res.status(404).json({ success: false, message: "Resource not linked to this assessment" });
    }

    res.status(200).json({
      success: true,
      message: "Resource unlinked successfully",
    });
  } catch (error) {
    console.error("❌ Unlink resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unlink resource",
      error: error.message,
    });
  }
};