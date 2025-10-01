import express from "express";
import DirectoryNational from "../models/DirectoryNational.js";
import DirectoryLocal from "../models/DirectoryLocal.js";
import DirectoryHotspots from "../models/DirectoryHotspots.js";
import { seedAllDirectories } from "../seeders/csvSeeder.js";

const router = express.Router();

// Get all Directory National records
router.get("/national", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", province = "", status = "", classification = "", type = "" } = req.query;
    
    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { contractor: { $regex: search, $options: "i" } },
        { commodity: { $regex: search, $options: "i" } },
        { municipality: { $regex: search, $options: "i" } },
        { barangay: { $regex: search, $options: "i" } }
      ];
    }
    if (province) query.province = { $regex: province, $options: "i" };
    if (status) query.status = { $regex: status, $options: "i" };
    if (classification) query.classification = { $regex: classification, $options: "i" };
    if (type && type !== "all") {
      // Check if the selected type itself contains "application"
      if (type.toLowerCase().includes('application')) {
        // If user explicitly selects an "Application for" type, show only those
        query.type = { $regex: type, $options: "i" };
      } else {
        // Otherwise, exclude applications when filtering by specific permit type
        query.$and = [
          { type: { $regex: type, $options: "i" } },
          { type: { $not: /application/i } }
        ];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      DirectoryNational.find(query)
        .sort({ contractNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DirectoryNational.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + records.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching Directory National:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory National records",
      error: error.message
    });
  }
});

// Get all Directory Local records
router.get("/local", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", province = "", status = "", classification = "", type = "" } = req.query;
    
    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { permitHolder: { $regex: search, $options: "i" } },
        { commodities: { $regex: search, $options: "i" } },
        { municipality: { $regex: search, $options: "i" } },
        { barangays: { $regex: search, $options: "i" } }
      ];
    }
    if (province) query.province = { $regex: province, $options: "i" };
    if (status) query.status = { $regex: status, $options: "i" };
    if (classification) query.classification = { $regex: classification, $options: "i" };
    if (type && type !== "all") {
      // Check if the selected type itself contains "application"
      if (type.toLowerCase().includes('application')) {
        // If user explicitly selects an "Application for" type, show only those
        query.type = { $regex: type, $options: "i" };
      } else {
        // Otherwise, exclude applications when filtering by specific permit type
        query.$and = [
          { type: { $regex: type, $options: "i" } },
          { type: { $not: /application/i } }
        ];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      DirectoryLocal.find(query)
        .sort({ permitNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DirectoryLocal.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + records.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching Directory Local:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory Local records",
      error: error.message
    });
  }
});

// Get all Directory Hotspots records
router.get("/hotspots", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", province = "", municipality = "", type = "", classification = "", status = "" } = req.query;
    
    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { complaintNumber: { $regex: search, $options: "i" } },
        { natureOfReportedIllegalAct: { $regex: search, $options: "i" } },
        { typeOfCommodity: { $regex: search, $options: "i" } },
        { barangay: { $regex: search, $options: "i" } }
      ];
    }
    if (province) query.province = { $regex: province, $options: "i" };
    if (municipality) query.municipality = { $regex: municipality, $options: "i" };
    if (classification) query.natureOfReportedIllegalAct = { $regex: classification, $options: "i" };
    if (type) query.typeOfCommodity = { $regex: type, $options: "i" };
    if (status) query.actionsTaken = { $regex: status, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      DirectoryHotspots.find(query)
        .sort({ complaintNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DirectoryHotspots.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + records.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching Directory Hotspots:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory Hotspots records",
      error: error.message
    });
  }
});

// Get single record by ID for any directory type
router.get("/national/:id", async (req, res) => {
  try {
    const record = await DirectoryNational.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Directory National record not found"
      });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory National record",
      error: error.message
    });
  }
});

router.get("/local/:id", async (req, res) => {
  try {
    const record = await DirectoryLocal.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Directory Local record not found"
      });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory Local record",
      error: error.message
    });
  }
});

router.get("/hotspots/:id", async (req, res) => {
  try {
    const record = await DirectoryHotspots.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Directory Hotspots record not found"
      });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Directory Hotspots record",
      error: error.message
    });
  }
});

// Get statistics for all directories
router.get("/stats", async (req, res) => {
  try {
    const [nationalCount, localCount, hotspotsCount] = await Promise.all([
      DirectoryNational.countDocuments(),
      DirectoryLocal.countDocuments(),
      DirectoryHotspots.countDocuments()
    ]);

    // Get status breakdown for national and local
    const [nationalStatus, localStatus] = await Promise.all([
      DirectoryNational.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      DirectoryLocal.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    // Get province breakdown
    const provinceStats = await DirectoryNational.aggregate([
      { $group: { _id: "$province", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          national: nationalCount,
          local: localCount,
          hotspots: hotspotsCount,
          overall: nationalCount + localCount + hotspotsCount
        },
        statusBreakdown: {
          national: nationalStatus,
          local: localStatus
        },
        topProvinces: provinceStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch directory statistics",
      error: error.message
    });
  }
});

// Seed database from CSV files (admin endpoint)
router.post("/seed", async (req, res) => {
  try {
    console.log("🚀 Starting CSV seeding process...");
    const result = await seedAllDirectories();
    
    res.json({
      success: true,
      message: "Database seeded successfully from CSV files",
      data: result
    });
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed database from CSV files",
      error: error.message
    });
  }
});

export default router;
