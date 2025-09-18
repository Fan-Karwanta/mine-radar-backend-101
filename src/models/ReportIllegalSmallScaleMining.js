const mongoose = require('mongoose');

const IllegalSmallScaleMiningReportSchema = new mongoose.Schema({
  // Common fields for all reports
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  reportType: {
    type: String,
    default: 'illegal_smallscale',
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

  // Site status
  siteStatus: {
    type: String,
    enum: ['operating', 'non_operating'],
    required: true
  },

  // Operating status activities
  operatingActivities: {
    extraction: { type: Boolean, default: false },
    disposition: { type: Boolean, default: false },
    mineralProcessing: { type: Boolean, default: false },
    tunneling: { type: Boolean, default: false },
    shaftSinking: { type: Boolean, default: false },
    goldPanning: { type: Boolean, default: false },
    amalgamation: { type: Boolean, default: false },
    others: { type: Boolean, default: false }
  },

  // Equipment used for activities
  equipmentUsed: {
    extraction: {
      type: String,
      default: ''
    },
    disposition: {
      type: String,
      default: ''
    },
    mineralProcessing: {
      type: String,
      default: ''
    }
  },

  // Other activities description
  othersActivity: {
    type: String,
    default: ''
  },

  // Operator information
  operatorInfo: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    determinationMethod: {
      type: String,
      required: true
    }
  },

  // Non-operating status observations
  nonOperatingObservations: {
    excavations: { type: Boolean, default: false },
    stockpiles: { type: Boolean, default: false },
    tunnels: { type: Boolean, default: false },
    mineShafts: { type: Boolean, default: false },
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
      question1: String, // Recent activity
      question2: String, // Extraction start and frequency
      question3: String, // Transport vehicles
      question4: String, // Operator name
      question5: String, // Operator address
      question6: String  // Permits
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
IllegalSmallScaleMiningReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `ILS-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ReportIllegalSmallScaleMining', IllegalSmallScaleMiningReportSchema);
