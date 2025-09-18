const mongoose = require('mongoose');

const IllegalMiningReportSchema = new mongoose.Schema({
  // Common fields for all reports
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  reportType: {
    type: String,
    default: 'illegal_mining',
    required: true
  },
  language: {
    type: String,
    enum: ['english', 'filipino'],
    required: true
  },
  submittedBy: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'under_investigation', 'resolved', 'dismissed'],
    default: 'pending'
  },

  // Location and GPS data
  gpsLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  location: {
    type: String,
    required: true
  },
  
  // Date and time
  incidentDate: {
    type: String,
    required: true
  },
  incidentTime: {
    type: String,
    required: true
  },

  // Project information
  projectInfo: {
    hasSignboard: {
      type: String,
      enum: ['yes', 'no', 'not_determined'],
      default: 'not_determined'
    },
    projectName: {
      type: String,
      default: ''
    }
  },

  // Commodity information
  commodity: {
    type: String,
    required: true
  },

  // Site status and activities
  siteStatus: {
    type: String,
    enum: ['operating', 'non_operating'],
    required: true
  },

  // Operating status fields
  operatingActivities: {
    extraction: {
      active: { type: Boolean, default: false },
      equipment: [String]
    },
    disposition: {
      active: { type: Boolean, default: false },
      equipment: [String]
    },
    processing: {
      active: { type: Boolean, default: false },
      equipment: [String]
    }
  },

  // Operator information (for operating sites)
  operatorInfo: {
    name: String,
    address: String,
    determinationMethod: String
  },

  // Non-operating status fields
  nonOperatingObservations: {
    excavations: { type: Boolean, default: false },
    accessRoad: { type: Boolean, default: false },
    processingFacility: { type: Boolean, default: false }
  },

  // Interview information (for non-operating sites)
  interview: {
    conducted: {
      type: Boolean,
      default: false
    },
    responses: {
      recentActivity: String,
      excavationStart: String,
      transportVehicles: String,
      operatorName: String,
      operatorAddress: String,
      permits: String
    }
  },

  // Additional information
  additionalInfo: {
    type: String,
    default: ''
  },

  // Photos/attachments
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now },
    geotagged: { type: Boolean, default: false }
  }],

  // Certification
  certified: {
    type: Boolean,
    default: true
  },
  certificationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique report ID
IllegalMiningReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `ILM-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ReportIllegalMining', IllegalMiningReportSchema);
