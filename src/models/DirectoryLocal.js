import mongoose from "mongoose";

const directoryLocalSchema = new mongoose.Schema(
  {
    classification: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      default: "Unknown",
    },
    permitNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    permitHolder: {
      type: String,
      required: true,
    },
    commodities: {
      type: String,
      default: "Unknown",
    },
    area: {
      type: String, // in hectares or other units
      default: "",
    },
    barangays: {
      type: String,
      default: "Unknown",
    },
    municipality: {
      type: String,
      default: "Unknown",
    },
    province: {
      type: String,
      default: "Unknown",
    },
    googleMapLink: {
      type: String,
      default: "",
    },
    dateFiled: {
      type: String,
      default: "",
    },
    dateApproved: {
      type: String,
      default: "",
    },
    dateOfExpiry: {
      type: String,
      default: "",
    },
    numberOfRenewal: {
      type: Number,
      default: 0,
    },
    dateOfFirstIssuance: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "Unknown",
    },
  },
  { timestamps: true }
);

const DirectoryLocal = mongoose.model("DirectoryLocal", directoryLocalSchema);

export default DirectoryLocal;
