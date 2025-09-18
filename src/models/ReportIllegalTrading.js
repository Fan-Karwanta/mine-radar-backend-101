const mongoose = require('mongoose');

const IllegalTradingReportSchema = new mongoose.Schema({
  // Common fields for all reports
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  reportType: {
    type: String,
    default: 'illegal_trading',
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

  // Violation type (always trading without permit for this report type)
  violationType: {
    type: String,
    default: 'trading_without_permit',
    required: true
  },

  // Business information
  businessInfo: {
    name: {
      type: String,
      required: true
    },
    owner: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    }
  },

  // Commodity information
  commodity: {
    type: String,
    required: true
  },

  // Source of commodity
  commoditySource: {
    name: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    determinationMethod: {
      type: String,
      required: true
    }
  },

  // Stockpiled materials
  stockpiledMaterials: {
    type: String,
    enum: ['yes', 'no', 'none', 'not_determined'],
    required: true
  },

  // DTI Registration
  dtiRegistration: {
    type: String,
    enum: ['yes', 'no', 'not_determined'],
    required: true
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
IllegalTradingReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `ILD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ReportIllegalTrading', IllegalTradingReportSchema);
