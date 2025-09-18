import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
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

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mining-reports',
        resource_type: 'image',
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// POST /api/upload/image - Upload single image to Cloudinary
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Parse geo data if provided
    let geoData = null;
    if (req.body.geoData) {
      try {
        geoData = JSON.parse(req.body.geoData);
      } catch (error) {
        console.warn('Invalid geo data format:', error);
      }
    }

    // Upload to Cloudinary
    const uploadOptions = {
      public_id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Add geo data as context if available
    if (geoData && geoData.latitude && geoData.longitude) {
      uploadOptions.context = `lat=${geoData.latitude}|lng=${geoData.longitude}`;
    }

    const result = await uploadToCloudinary(req.file.buffer, uploadOptions);

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      geotagged: !!(geoData && geoData.latitude && geoData.longitude),
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// POST /api/upload/images - Upload multiple images to Cloudinary
router.post('/images', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const uploadOptions = {
          public_id: `report_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        };

        const result = await uploadToCloudinary(file.buffer, uploadOptions);
        
        return {
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          originalName: file.originalname
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);

    res.json({
      success: true,
      uploaded: successful,
      failed: failed,
      totalUploaded: successful.length,
      totalFailed: failed.length
    });
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// DELETE /api/upload/:publicId - Delete image from Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found or already deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// GET /api/upload/info/:publicId - Get image info from Cloudinary
router.get('/info/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    const result = await cloudinary.api.resource(publicId);
    
    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
        context: result.context || {}
      }
    });
  } catch (error) {
    console.error('Error getting image info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image info',
      error: error.message
    });
  }
});

export default router;
