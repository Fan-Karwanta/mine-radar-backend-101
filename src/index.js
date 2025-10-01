import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import reportDraftsRoutes from "./routes/reportDraftsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

job.start();

// CORS must be before other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'https://mine-radar-admin.vercel.app',
      'http://localhost:5173',
      'http://localhost:3001'
    ];
    
    // Check for exact match first
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    
    // Check for Vercel preview/deployment URLs (they have dynamic subdomains)
    const isVercelPreview = origin && (
      origin.includes('mine-radar-admin') && 
      origin.includes('.vercel.app')
    );
    
    // Check for localhost with any port
    const isLocalhost = origin && (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('https://localhost:')
    );
    
    if (isVercelPreview || isLocalhost) {
      console.log('CORS allowed origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "Mining App API is running!", status: "healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reportdrafts", reportDraftsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
