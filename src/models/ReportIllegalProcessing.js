const mongoose = require('mongoose');

const IllegalProcessingReportSchema = new mongoose.Schema({
  // Common fields for all reports
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  reportType: {
    type: String,
    default: 'illegal_processing',
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

  // Site status
  siteStatus: {
    type: String,
    enum: ['operating', 'non_operating', 'under_construction'],
    required: true
  },

  // Facility information
  facilityInfo: {
    type: {
      type: String,
      required: true
    },
    processingProducts: {
      type: String,
      required: true
    }
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

  // Raw materials information
  rawMaterials: {
    sourceName: {
      type: String,
      required: true
    },
    sourceLocation: {
      type: String,
      required: true
    },
    determinationMethod: {
      type: String,
      required: true
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
IllegalProcessingReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `ILP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ReportIllegalProcessing', IllegalProcessingReportSchema);
