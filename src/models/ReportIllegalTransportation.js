const mongoose = require('mongoose');

const IllegalTransportationReportSchema = new mongoose.Schema({
  // Common fields for all reports
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  reportType: {
    type: String,
    default: 'illegal_transport',
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

  // Violation type
  violationType: {
    type: String,
    enum: ['absence', 'outdated', 'fraudulent'],
    required: true
  },
  documentType: {
    type: String,
    default: ''
  },

  // Commodity information
  commodity: {
    type: String,
    required: true
  },

  // Volume and weight
  materialInfo: {
    volumeWeight: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  },

  // Vehicle information
  vehicleInfo: {
    type: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    bodyColor: {
      type: String,
      required: true
    },
    plateNumber: {
      type: String,
      required: true
    }
  },

  // Owner/Operator information
  ownerOperator: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },

  // Driver information
  driver: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },

  // Source and actions
  sourceOfMaterials: {
    type: String,
    required: true
  },
  actionsTaken: {
    type: String,
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
IllegalTransportationReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `ILT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ReportIllegalTransportation', IllegalTransportationReportSchema);
