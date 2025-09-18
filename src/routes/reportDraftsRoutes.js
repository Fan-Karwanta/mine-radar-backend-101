import express from 'express';
import ReportDraft from '../models/ReportDraft.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/drafts');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/reportdrafts - Get all drafts with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      reportType,
      submittedBy,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = { isDraft: true };
    
    if (reportType) filter.reportType = reportType;
    if (submittedBy) filter.submittedBy = new RegExp(submittedBy, 'i');
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const drafts = await ReportDraft.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await ReportDraft.countDocuments(filter);

    res.json({
      success: true,
      data: drafts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drafts',
      error: error.message
    });
  }
});

// GET /api/reportdrafts/:id - Get specific draft by ID
router.get('/:id', async (req, res) => {
  try {
    const draft = await ReportDraft.findById(req.params.id);
    
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching draft',
      error: error.message
    });
  }
});

// POST /api/reportdrafts - Create new draft
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const draftData = req.body;
    
    // Parse JSON strings if they exist
    if (typeof draftData.gpsLocation === 'string') {
      draftData.gpsLocation = JSON.parse(draftData.gpsLocation);
    }
    if (typeof draftData.projectInfo === 'string') {
      draftData.projectInfo = JSON.parse(draftData.projectInfo);
    }
    if (typeof draftData.operatorInfo === 'string') {
      draftData.operatorInfo = JSON.parse(draftData.operatorInfo);
    }

    // Parse type-specific data based on report type
    switch (draftData.reportType) {
      case 'illegal_mining':
        if (typeof draftData.miningData === 'string') {
          draftData.miningData = JSON.parse(draftData.miningData);
        }
        break;
      case 'illegal_transport':
        if (typeof draftData.transportData === 'string') {
          draftData.transportData = JSON.parse(draftData.transportData);
        }
        break;
      case 'illegal_processing':
        if (typeof draftData.processingData === 'string') {
          draftData.processingData = JSON.parse(draftData.processingData);
        }
        break;
      case 'illegal_trading':
        if (typeof draftData.tradingData === 'string') {
          draftData.tradingData = JSON.parse(draftData.tradingData);
        }
        break;
      case 'illegal_exploration':
        if (typeof draftData.explorationData === 'string') {
          draftData.explorationData = JSON.parse(draftData.explorationData);
        }
        break;
      case 'illegal_smallscale':
        if (typeof draftData.smallScaleData === 'string') {
          draftData.smallScaleData = JSON.parse(draftData.smallScaleData);
        }
        break;
    }

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      draftData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadedAt: new Date(),
        geotagged: false // This could be enhanced to read EXIF data
      }));
    }

    // Ensure draft status
    draftData.status = 'draft';
    draftData.isDraft = true;

    // Create new draft
    const draft = new ReportDraft(draftData);
    await draft.save();

    res.status(201).json({
      success: true,
      message: 'Draft saved successfully',
      data: draft
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving draft',
      error: error.message
    });
  }
});

// PUT /api/reportdrafts/:id - Update draft
router.put('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const draftData = req.body;
    
    // Parse JSON strings if they exist
    if (typeof draftData.gpsLocation === 'string') {
      draftData.gpsLocation = JSON.parse(draftData.gpsLocation);
    }
    if (typeof draftData.projectInfo === 'string') {
      draftData.projectInfo = JSON.parse(draftData.projectInfo);
    }
    if (typeof draftData.operatorInfo === 'string') {
      draftData.operatorInfo = JSON.parse(draftData.operatorInfo);
    }

    // Parse type-specific data based on report type
    switch (draftData.reportType) {
      case 'illegal_mining':
        if (typeof draftData.miningData === 'string') {
          draftData.miningData = JSON.parse(draftData.miningData);
        }
        break;
      case 'illegal_transport':
        if (typeof draftData.transportData === 'string') {
          draftData.transportData = JSON.parse(draftData.transportData);
        }
        break;
      case 'illegal_processing':
        if (typeof draftData.processingData === 'string') {
          draftData.processingData = JSON.parse(draftData.processingData);
        }
        break;
      case 'illegal_trading':
        if (typeof draftData.tradingData === 'string') {
          draftData.tradingData = JSON.parse(draftData.tradingData);
        }
        break;
      case 'illegal_exploration':
        if (typeof draftData.explorationData === 'string') {
          draftData.explorationData = JSON.parse(draftData.explorationData);
        }
        break;
      case 'illegal_smallscale':
        if (typeof draftData.smallScaleData === 'string') {
          draftData.smallScaleData = JSON.parse(draftData.smallScaleData);
        }
        break;
    }

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadedAt: new Date(),
        geotagged: false
      }));
      
      // Add new attachments to existing ones
      if (draftData.attachments) {
        draftData.attachments = [...draftData.attachments, ...newAttachments];
      } else {
        draftData.attachments = newAttachments;
      }
    }

    // Ensure draft status
    draftData.status = 'draft';
    draftData.isDraft = true;

    const draft = await ReportDraft.findByIdAndUpdate(
      req.params.id,
      draftData,
      { new: true, runValidators: true }
    );

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    res.json({
      success: true,
      message: 'Draft updated successfully',
      data: draft
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating draft',
      error: error.message
    });
  }
});

// DELETE /api/reportdrafts/:id - Delete draft
router.delete('/:id', async (req, res) => {
  try {
    const draft = await ReportDraft.findByIdAndDelete(req.params.id);
    
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    // Delete associated files
    if (draft.attachments && draft.attachments.length > 0) {
      draft.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting draft',
      error: error.message
    });
  }
});

// GET /api/reportdrafts/user/:userId - Get drafts by specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const drafts = await ReportDraft.find({ 
      submittedBy: req.params.userId,
      isDraft: true 
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await ReportDraft.countDocuments({ 
      submittedBy: req.params.userId,
      isDraft: true 
    });

    res.json({
      success: true,
      data: drafts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Error fetching user drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user drafts',
      error: error.message
    });
  }
});

export default router;
