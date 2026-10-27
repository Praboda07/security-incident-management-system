const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const Incident = require("../models/Incident");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const uploadsDirectory = path.join(__dirname, "..", "uploads");

router.use(authMiddleware);

function requireOrganization(req, res, next) {
  if (!req.user.organizationId) {
    return res.status(403).json({
      message: "Your account is not linked to an organization.",
    });
  }

  next();
}

router.use(requireOrganization);

// CREATE INCIDENT WITH OPTIONAL EVIDENCE IMAGES
router.post("/", (req, res, next) => {
  upload.array("images", 5)(req, res, function (error) {
    if (error) {
      return res.status(400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Each image must be 5 MB or smaller."
            : error.code === "LIMIT_FILE_COUNT"
            ? "You can attach a maximum of 5 images."
            : error.message || "Image upload failed.",
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const { title, description, category, severity } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        message: "Title, description, and category are required.",
      });
    }

    const images = (req.files || []).map(
      (file) => `/uploads/${file.filename}`
    );

    const incident = await Incident.create({
      title,
      description,
      category,
      severity,
      images,
      reportedBy: req.user.userId,
      organizationId: req.user.organizationId,
    });

    return res.status(201).json({
      message: "Incident created successfully.",
      incident,
    });
  } catch (error) {
    console.error("Create incident error:", error.message);

    for (const file of req.files || []) {
      fs.unlink(
        path.join(uploadsDirectory, file.filename),
        () => {}
      );
    }

    return res.status(400).json({
      message: "Failed to create incident.",
      error: error.message,
    });
  }
});

// GET INCIDENTS
router.get("/", async (req, res) => {
  try {
    const filter = {
      organizationId: req.user.organizationId,
    };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incidents = await Incident.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json(incidents);
  } catch (error) {
    console.error("Fetch incidents error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch incidents.",
    });
  }
});

// GET ONE INCIDENT
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid incident ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      organizationId: req.user.organizationId,
    };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incident = await Incident.findOne(filter);

    if (!incident) {
      return res.status(404).json({
        message: "Incident not found.",
      });
    }

    return res.status(200).json(incident);
  } catch (error) {
    console.error("Fetch incident error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch incident.",
    });
  }
});

// UPDATE INCIDENT
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid incident ID.",
      });
    }

    const { title, description, category, severity, status } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (severity !== undefined) updates.severity = severity;

    if (status !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only organization admins can change incident status.",
        });
      }

      const allowedStatuses = ["Open", "In Progress", "Resolved"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid incident status.",
        });
      }

      updates.status = status;
    }

    const filter = {
      _id: req.params.id,
      organizationId: req.user.organizationId,
    };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incident = await Incident.findOneAndUpdate(
      filter,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!incident) {
      return res.status(404).json({
        message: "Incident not found.",
      });
    }

    return res.status(200).json({
      message: "Incident updated successfully.",
      incident,
    });
  } catch (error) {
    console.error("Update incident error:", error.message);

    return res.status(400).json({
      message: "Failed to update incident.",
      error: error.message,
    });
  }
});

// DELETE INCIDENT
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid incident ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      organizationId: req.user.organizationId,
    };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incident = await Incident.findOneAndDelete(filter);

    if (!incident) {
      return res.status(404).json({
        message: "Incident not found.",
      });
    }

    for (const imagePath of incident.images || []) {
      const filename = path.basename(imagePath);
      const fullPath = path.join(uploadsDirectory, filename);

      fs.unlink(fullPath, (error) => {
        if (error && error.code !== "ENOENT") {
          console.error("Unable to delete evidence image:", error.message);
        }
      });
    }

    return res.status(200).json({
      message: "Incident deleted successfully.",
    });
  } catch (error) {
    console.error("Delete incident error:", error.message);

    return res.status(500).json({
      message: "Failed to delete incident.",
    });
  }
});

module.exports = router;