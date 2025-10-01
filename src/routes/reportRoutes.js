import express from 'express';
import Report from '../models/Report.js';
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
    const uploadPath = path.join(__dirname, '../../uploads/reports');
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

// GET /api/reports - Get all reports with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      reportType,
      status,
      language,
      submittedBy,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (reportType) filter.reportType = reportType;
    if (status) filter.status = status;
    if (language) filter.language = language;
    if (submittedBy) filter.submittedBy = new RegExp(submittedBy, 'i');
    
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    // Execute query with pagination and populate user info
    const reports = await Report.find(filter)
      .populate('submittedBy', 'email completeName username')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// GET /api/reports/stats - Get report statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          underInvestigation: { $sum: { $cond: [{ $eq: ['$status', 'under_investigation'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Report.aggregate([
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    const languageStats = await Report.aggregate([
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || { total: 0, pending: 0, underInvestigation: 0, resolved: 0, dismissed: 0 },
        byType: typeStats,
        byLanguage: languageStats
      }
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report statistics',
      error: error.message
    });
  }
});

// GET /api/reports/:id - Get specific report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('submittedBy', 'email completeName username');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
});

// POST /api/reports - Create new report
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const reportData = req.body;
    
    // Parse JSON strings if they exist
    if (typeof reportData.gpsLocation === 'string') {
      reportData.gpsLocation = JSON.parse(reportData.gpsLocation);
    }
    if (typeof reportData.projectInfo === 'string') {
      reportData.projectInfo = JSON.parse(reportData.projectInfo);
    }
    if (typeof reportData.operatorInfo === 'string') {
      reportData.operatorInfo = JSON.parse(reportData.operatorInfo);
    }

    // Parse type-specific data based on report type
    switch (reportData.reportType) {
      case 'illegal_mining':
        if (typeof reportData.miningData === 'string') {
          reportData.miningData = JSON.parse(reportData.miningData);
        }
        break;
      case 'illegal_transport':
        if (typeof reportData.transportData === 'string') {
          reportData.transportData = JSON.parse(reportData.transportData);
        }
        break;
      case 'illegal_processing':
        if (typeof reportData.processingData === 'string') {
          reportData.processingData = JSON.parse(reportData.processingData);
        }
        break;
      case 'illegal_trading':
        if (typeof reportData.tradingData === 'string') {
          reportData.tradingData = JSON.parse(reportData.tradingData);
        }
        break;
      case 'illegal_exploration':
        if (typeof reportData.explorationData === 'string') {
          reportData.explorationData = JSON.parse(reportData.explorationData);
        }
        break;
      case 'illegal_smallscale':
        if (typeof reportData.smallScaleData === 'string') {
          reportData.smallScaleData = JSON.parse(reportData.smallScaleData);
        }
        break;
    }

    // Handle Cloudinary attachments (already uploaded images)
    if (reportData.cloudinaryAttachments) {
      try {
        const cloudinaryAttachments = typeof reportData.cloudinaryAttachments === 'string' 
          ? JSON.parse(reportData.cloudinaryAttachments) 
          : reportData.cloudinaryAttachments;
        
        reportData.attachments = cloudinaryAttachments;
        console.log('✅ Using Cloudinary attachments:', cloudinaryAttachments.length);
      } catch (error) {
        console.error('Error parsing Cloudinary attachments:', error);
      }
    }
    
    // Handle file attachments (legacy/fallback)
    if (req.files && req.files.length > 0) {
      reportData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadedAt: new Date(),
        geotagged: false
      }));
      console.log('✅ Using file attachments:', req.files.length);
    }

    // Create new report
    const report = new Report(reportData);
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
});

// PUT /api/reports/:id - Update report (for status changes, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { status, additionalInfo } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (additionalInfo !== undefined) updateData.additionalInfo = additionalInfo;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
      error: error.message
    });
  }
});

// DELETE /api/reports/:id - Delete report (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Delete associated files
    if (report.attachments && report.attachments.length > 0) {
      report.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
});

// GET /api/reports/user/:userId - Get reports by specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await Report.find({ 
      submittedBy: req.params.userId,
      $or: [
        { status: { $ne: 'draft' } },
        { status: { $exists: false } }
      ]
    })
      .populate('submittedBy', 'email completeName username')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Report.countDocuments({ 
      submittedBy: req.params.userId,
      $or: [
        { status: { $ne: 'draft' } },
        { status: { $exists: false } }
      ]
    });

    res.json({
      success: true,
      data: reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports',
      error: error.message
    });
  }
});

export default router;
