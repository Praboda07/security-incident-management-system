
const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Phishing",
        "Malware",
        "Unauthorized Access",
        "Suspicious Activity",
        "Other"
      ]
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incident", incidentSchema);
