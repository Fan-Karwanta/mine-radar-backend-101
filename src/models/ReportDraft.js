import mongoose from 'mongoose';

const reportDraftSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: [
      'illegal_mining',
      'illegal_transport', 
      'illegal_processing',
      'illegal_trading',
      'illegal_exploration',
      'illegal_smallscale'
    ]
  },
  language: {
    type: String,
    enum: ['english', 'filipino'],
    default: 'english'
  },
  submittedBy: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'draft'
  },
  isDraft: {
    type: Boolean,
    default: true
  },
  
  // Location Information
  gpsLocation: {
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false }
  },
  location: {
    type: String,
    required: false
  },
  
  // Incident Details
  incidentDate: String,
  incidentTime: String,
  commodity: String,
  siteStatus: {
    type: String,
    enum: ['operating', 'non_operating'],
    default: 'operating'
  },
  
  // Project Information
  projectInfo: {
    hasSignboard: {
      type: String,
      enum: ['yes', 'no', 'not_determined']
    },
    projectName: String
  },
  
  // Operator Information
  operatorInfo: {
    name: String,
    address: String,
    determinationMethod: String
  },
  
  // Type-specific data (stored as flexible objects)
  miningData: mongoose.Schema.Types.Mixed,
  transportData: mongoose.Schema.Types.Mixed,
  processingData: mongoose.Schema.Types.Mixed,
  tradingData: mongoose.Schema.Types.Mixed,
  explorationData: mongoose.Schema.Types.Mixed,
  smallScaleData: mongoose.Schema.Types.Mixed,
  
  // Additional Information
  additionalInfo: String,
  
  // File Attachments
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now },
    geotagged: { type: Boolean, default: false }
  }]
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Index for efficient queries
reportDraftSchema.index({ submittedBy: 1, createdAt: -1 });
reportDraftSchema.index({ reportType: 1 });

const ReportDraft = mongoose.model('ReportDraft', reportDraftSchema);

export default ReportDraft;
