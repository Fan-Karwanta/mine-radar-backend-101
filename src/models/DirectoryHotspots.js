import mongoose from "mongoose";

const directoryHotspotsSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
    },
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
    },
    province: {
      type: String,
      required: true,
    },
    municipality: {
      type: String,
      required: true,
    },
    barangay: {
      type: String,
      required: true,
    },
    sitio: {
      type: String,
      default: "",
    },
    longitude: {
      type: String,
      default: "",
    },
    latitude: {
      type: String,
      default: "",
    },
    googleMapLink: {
      type: String,
      default: "",
    },
    natureOfReportedIllegalAct: {
      type: String,
      required: true,
    },
    typeOfCommodity: {
      type: String,
      required: true,
    },
    actionsTaken: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    dateOfActionTaken: {
      type: String,
      default: "",
    },
    lawsViolated: {
      type: String,
      default: "",
    },
    numberOfCDOIssued: {
      type: Number,
      default: 0,
    },
    dateIssued: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const DirectoryHotspots = mongoose.model("DirectoryHotspots", directoryHotspotsSchema);

export default DirectoryHotspots;
