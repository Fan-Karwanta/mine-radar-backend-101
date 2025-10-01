import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import User from '../models/User.js';
import Report from '../models/Report.js';
import DirectoryNational from '../models/DirectoryNational.js';
import DirectoryLocal from '../models/DirectoryLocal.js';
import DirectoryHotspots from '../models/DirectoryHotspots.js';

const router = express.Router();
router.use(cookieParser());

// Admin signup
router.post('/auth/signup', async (req, res) => {
  try {
    const { completeName, email, password, agency, position, contactNumber } = req.body;

    // Validation
    if (!completeName || !email || !password || !agency || !position || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password should be at least 6 characters long"
      });
    }

    if (completeName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Complete name should be at least 2 characters long"
      });
    }

    // Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    // Generate profile image using email
    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

    // Create new admin user (pending approval)
    const user = new User({
      completeName,
      email,
      password,
      agency,
      position,
      contactNumber,
      profileImage,
      role: 'admin',
      status: 'pending',
      isApproved: false
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Admin account created successfully. Please wait for approval.",
      user: {
        id: user._id,
        email: user.email,
        completeName: user.completeName,
        agency: user.agency,
        position: user.position,
        contactNumber: user.contactNumber,
        status: user.status,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Admin login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for hardcoded admin credentials first (using email)
    if (email === 'admin@mineradar.com' && password === 'admin_mineradar1234') {
      const token = jwt.sign(
        { 
          id: 'admin', 
          email: 'admin@mineradar.com', 
          role: 'admin' 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token: token,
        admin: {
          id: 'admin',
          email: 'admin@mineradar.com',
          completeName: 'MineRadar Admin',
          role: 'admin'
        }
      });
    }

    // Check database for registered admin users
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if user is approved
    if (!user.isApproved || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is pending approval or has been blocked'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      admin: {
        id: user._id,
        email: user.email,
        completeName: user.completeName,
        agency: user.agency,
        position: user.position,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Admin logout
router.post('/auth/logout', async (req, res) => {
  try {
    // No server-side action needed for localStorage tokens
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Admin auth verification
router.get('/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    res.json({
      success: true,
      admin: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('Admin auth verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Middleware to verify admin token from Authorization header
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin role required.' 
      });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Dashboard Analytics
router.get('/dashboard/analytics', verifyAdminToken, async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalReports = await Report.countDocuments();
    const totalNationalDirectory = await DirectoryNational.countDocuments();
    const totalLocalDirectory = await DirectoryLocal.countDocuments();
    const totalHotspots = await DirectoryHotspots.countDocuments();

    // Get reports by status
    const reportsByStatus = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get reports by type
    const reportsByType = await Report.aggregate([
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get reports by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const reportsByMonth = await Report.aggregate([
      {
        $match: {
          submittedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent reports (last 10)
    const recentReports = await Report.find()
      .populate('submittedBy', 'email completeName')
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('reportId reportType status submittedBy submittedAt location');

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          reports: totalReports,
          nationalDirectory: totalNationalDirectory,
          localDirectory: totalLocalDirectory,
          hotspots: totalHotspots
        },
        reportsByStatus,
        reportsByType,
        reportsByMonth,
        usersByRole,
        recentReports
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics'
    });
  }
});

// Get all reports with pagination and filters
router.get('/reports', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.reportType) filter.reportType = req.query.reportType;
    if (req.query.search) {
      filter.$or = [
        { reportId: { $regex: req.query.search, $options: 'i' } },
        { submittedBy: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const reports = await Report.find(filter)
      .populate('submittedBy', 'email completeName')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

// Get single report by ID
router.get('/reports/:id', verifyAdminToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('submittedBy', 'email completeName');
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
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report'
    });
  }
});

// Update report status
router.put('/reports/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'under_investigation', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

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
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report status'
    });
  }
});

// Delete report
router.delete('/reports/:id', verifyAdminToken, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report'
    });
  }
});

// Get all users with pagination and filters
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { completeName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Update user role
router.put('/users/:id/role', verifyAdminToken, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['Public User', 'Deputized Personnel', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role value'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role'
    });
  }
});

// Update user status (block/unblock)
router.put('/users/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
});

// Delete user
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// Get pending admin approvals
router.get('/pending-admins', verifyAdminToken, async (req, res) => {
  try {
    const pendingAdmins = await User.find({ 
      role: 'admin', 
      status: 'pending',
      isApproved: false 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingAdmins
    });
  } catch (error) {
    console.error('Get pending admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending admin approvals'
    });
  }
});

// Approve admin user
router.put('/approve-admin/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'active',
        isApproved: true 
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin user approved successfully',
      data: user
    });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving admin user'
    });
  }
});

// Reject admin user
router.put('/reject-admin/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'blocked',
        isApproved: false 
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin user rejected successfully',
      data: user
    });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting admin user'
    });
  }
});

export default router;
