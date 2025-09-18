import express from "express";
import cors from "cors";
import "dotenv/config";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import reportDraftsRoutes from "./routes/reportDraftsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

job.start();
app.use(express.json());
app.use(cors());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
