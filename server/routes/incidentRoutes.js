
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Incident = require("../models/Incident");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// CREATE incident
router.post("/", async (req, res) => {
  try {
    const { title, description, category, severity } = req.body;

    const incident = await Incident.create({
      title,
      description,
      category,
      severity,
      reportedBy: req.user.userId,
    });

    res.status(201).json({
      message: "Incident created successfully",
      incident,
    });
  } catch (error) {
    console.error("Create incident error:", error);

res.status(400).json({
  message: "Failed to create incident",
  error: error.message,
});
  }
});

// READ incidents: users see their own; admins see all
router.get("/", async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { reportedBy: req.user.userId };

    const incidents = await Incident.find(filter).sort({
      createdAt: -1,
    });

    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch incidents",
    });
  }
});

// READ one incident
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid incident ID" });
    }

    const filter = { _id: req.params.id };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incident = await Incident.findOne(filter);

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json(incident);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch incident" });
  }
});

// UPDATE incident
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid incident ID" });
    }

    const { title, description, category, severity, status } = req.body;

    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (severity !== undefined) updates.severity = severity;

    // Only admins can change incident status
    if (status !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only admins can change incident status",
        });
      }

      updates.status = status;
    }

    const filter = { _id: req.params.id };

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
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json({
      message: "Incident updated successfully",
      incident,
    });
  } catch (error) {
    console.error("Update incident error:", error);

res.status(400).json({
  message: "Failed to update incident",
  error: error.message,
});
  }
});

// DELETE incident
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid incident ID" });
    }

    const filter = { _id: req.params.id };

    if (req.user.role !== "admin") {
      filter.reportedBy = req.user.userId;
    }

    const incident = await Incident.findOneAndDelete(filter);

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json({
      message: "Incident deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete incident",
    });
  }
});

module.exports = router;
