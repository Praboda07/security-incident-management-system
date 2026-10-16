
const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

// CREATE an incident
router.post("/", async (req, res) => {
  try {
    const { title, description, category, severity, status } = req.body;

    const incident = await Incident.create({
      title,
      description,
      category,
      severity,
      status
    });

    res.status(201).json({
      message: "Incident created successfully",
      incident
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to create incident",
      error: error.message
    });
  }
});

// READ all incidents
router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch incidents",
      error: error.message
    });
  }
});

// READ one incident
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json(incident);
  } catch (error) {
    res.status(400).json({
      message: "Invalid incident ID",
      error: error.message
    });
  }
});

// UPDATE an incident
router.put("/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json({
      message: "Incident updated successfully",
      incident
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update incident",
      error: error.message
    });
  }
});

// DELETE an incident
router.delete("/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.status(200).json({ message: "Incident deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: "Failed to delete incident",
      error: error.message
    });
  }
});

module.exports = router;
