import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  createAssessment,
  storeQuestionBlocks,
  getAssessmentsByInstructor,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  clearLinksForAssessment,
  storeResourceChunk,
} from '../models/assessmentModel.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { createResource, linkResourceToAssessment } from '../models/resourceModel.js';
import { extractTextFromFile, chunkText } from '../services/textProcessor.js';
import { generateEmbedding } from '../services/embeddingGenerator.js';
import {
  enrollStudentController,
  unenrollStudentController,
  getEnrolledStudentsController,
} from '../controllers/assessmentController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/assessments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const createAssessmentHandler = async (req, res) => {
  try {
    let {
      title,
      prompt = null,
      externalLinks = '[]',
      question_blocks = '[]',
      selected_resources = '[]',
    } = req.body;
    const instructor_id = req.user.id;
    const files = req.files || [];

    try {
      externalLinks = JSON.parse(externalLinks);
      question_blocks = JSON.parse(question_blocks);
      selected_resources = JSON.parse(selected_resources);
    } catch (error) {
      console.error('❌ Parsing error:', error.message, { title, prompt, externalLinks, question_blocks, selected_resources });
      return res.status(400).json({ success: false, message: 'Invalid data format in request' });
    }

    console.log(`🔄 Creating assessment for instructor ${instructor_id}`, { title, prompt, externalLinks, question_blocks, selected_resources, files: files.map(f => f.originalname) });

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt is required and must be a non-empty string' });
    }

    if (title && typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title must be a non-empty string if provided' });
    }

    // Validate question_blocks if provided
    if (question_blocks && Array.isArray(question_blocks) && question_blocks.length > 0) {
      for (const block of question_blocks) {
        if (!block.question_count || block.question_count < 1) {
          return res.status(400).json({ success: false, message: 'Question count must be at least 1 for each block' });
        }
        if (!block.duration_per_question || block.duration_per_question < 30) {
          return res.status(400).json({ success: false, message: 'Duration per question must be at least 30 seconds' });
        }
        if (block.question_type === 'multiple_choice' && (!block.num_options || block.num_options < 2)) {
          return res.status(400).json({ success: false, message: 'Multiple choice questions must have at least 2 options' });
        }
        if (block.question_type === 'matching') {
          if (!block.num_first_side || block.num_first_side < 2) {
            return res.status(400).json({ success: false, message: 'Matching questions must have at least 2 first-side options' });
          }
          if (!block.num_second_side || block.num_second_side < 2) {
            return res.status(400).json({ success: false, message: 'Matching questions must have at least 2 second-side options' });
          }
        }
      }
    }

    const assessmentData = {
      title: title || null,
      prompt: prompt.trim(),
      external_links: externalLinks && Array.isArray(externalLinks) ? externalLinks.filter(link => link && link.trim()) : null,
      instructor_id,
      is_executed: false,
    };

    console.log('📝 Assessment data sent to model:', assessmentData);

    const newAssessment = await createAssessment(assessmentData);

    if (question_blocks && Array.isArray(question_blocks) && question_blocks.length > 0) {
      console.log('📝 Question blocks sent to store:', { assessmentId: newAssessment.id, question_blocks, instructor_id });
      await storeQuestionBlocks(newAssessment.id, question_blocks, instructor_id);
    }

    const uploadedResources = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const resourceData = {
          name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size,
          content_type: 'file',
          visibility: 'private',
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
        console.log(`📝 Linked file resource: ${resource.id} to assessment ${newAssessment.id}`);
      }
    }

    if (selected_resources && Array.isArray(selected_resources)) {
      for (const resourceId of selected_resources) {
        if (resourceId && !isNaN(parseInt(resourceId))) {
          await linkResourceToAssessment(newAssessment.id, parseInt(resourceId));
          console.log(`📝 Linked selected resource: ${resourceId} to assessment ${newAssessment.id}`);
        } else {
          console.warn(`⚠️ Skipping invalid resourceId: ${resourceId}`);
        }
      }
    }

    console.log(`✅ Assessment created: ID=${newAssessment.id}`);
    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: newAssessment,
    });
  } catch (error) {
    console.error('❌ Create assessment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

router.post('/', protect, authorizeRoles('instructor', 'admin', 'super_admin'), upload.array('new_files'), createAssessmentHandler);

router.get('/', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const assessments = await getAssessmentsByInstructor(req.user.id);
    res.status(200).json({ success: true, data: assessments });
  } catch (error) {
    console.error('❌ Error fetching assessments:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.get('/instructor', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const assessments = await getAssessmentsByInstructor(req.user.id);
    res.status(200).json({ success: true, data: assessments });
  } catch (error) {
    console.error('❌ Error fetching assessments:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const assessment = await getAssessmentById(req.params.id, req.user.id, req.user.role);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or access denied' });
    }
    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    console.error('❌ Error fetching assessment:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.put('/:id', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const assessment = await updateAssessment(req.params.id, req.body);
    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    console.error('❌ Error updating assessment:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.delete('/:id', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    await deleteAssessment(req.params.id);
    res.status(200).json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting assessment:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.post('/:id/enroll', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    console.log(`🔍 Enroll request payload for assessment ${req.params.id}:`, req.body);
    await enrollStudentController(req, res);
  } catch (error) {
    console.error('❌ Error enrolling student:', error, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.delete('/:id/enroll/:studentId', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    await unenrollStudentController(req, res);
  } catch (error) {
    console.error('❌ Error unenrolling student:', error, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.get('/:id/enrolled-students', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    await getEnrolledStudentsController(req, res);
  } catch (error) {
    console.error('❌ Error fetching enrolled students:', error, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.put('/:id/clear-links', protect, authorizeRoles('instructor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const assessment = await clearLinksForAssessment(req.params.id);
    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    console.error('❌ Error clearing external links:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;