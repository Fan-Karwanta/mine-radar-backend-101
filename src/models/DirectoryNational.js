import mongoose from "mongoose";

const directoryNationalSchema = new mongoose.Schema(
  {
    classification: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      default: "Unknown",
    },
    contractNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    contractor: {
      type: String,
      required: true,
    },
    proponent: {
      type: String,
      default: "",
    },
    contactNumber: {
      type: String,
      default: "",
    },
    operator: {
      type: String,
      default: "",
    },
    area: {
      type: Number, // in hectares
      default: 0,
    },
    dateFiled: {
      type: String,
      default: "",
    },
    approvalDate: {
      type: String,
      default: "",
    },
    renewalDate: {
      type: String,
      default: "",
    },
    expirationDate: {
      type: String,
      default: "",
    },
    barangay: {
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
    commodity: {
      type: String,
      default: "Unknown",
    },
    status: {
      type: String,
      default: "Unknown",
    },
    sourceOfRawMaterials: {
      type: String,
      default: "N/A",
    },
  },
  { timestamps: true }
);

const DirectoryNational = mongoose.model("DirectoryNational", directoryNationalSchema);

export default DirectoryNational;
