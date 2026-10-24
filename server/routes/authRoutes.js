
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Organization = require("../models/organization");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Organization ekak saha admin account ekak hadanawa
router.post("/register-organization", async (req, res) => {
  let organization;

  try {
    const {
      organizationName,
      organizationEmail,
      name,
      email,
      password,
    } = req.body;

    if (
      !organizationName?.trim() ||
      !organizationEmail?.trim() ||
      !name?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const normalizedOrganizationEmail =
      organizationEmail.trim().toLowerCase();

    const normalizedEmail = email.trim().toLowerCase();

    const existingOrganization = await Organization.findOne({
      email: normalizedOrganizationEmail,
    });

    if (existingOrganization) {
      return res.status(409).json({
        message: "An organization with this email already exists.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    organization = await Organization.create({
      name: organizationName.trim(),
      email: normalizedOrganizationEmail,
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      organizationId: organization._id,
      approvalStatus: "approved",
    });

    return res.status(201).json({
      message: "Organization and admin account created successfully.",
      organization: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
      },
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        organizationId: admin.organizationId,
      },
    });
  } catch (error) {
    console.error("Organization registration error:", error);

    if (organization) {
      try {
        await Organization.findByIdAndDelete(organization._id);
      } catch (cleanupError) {
        console.error("Organization cleanup error:", cleanupError);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Organization registration failed.",
    });
  }
});

// Employee kenek registration request ekak yawana route eka
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      organizationId,
      employeeId,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !organizationId ||
      !employeeId?.trim()
    ) {
      return res.status(400).json({
        message:
          "Please provide your name, email, password, employee ID, and organization ID.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!mongoose.isValidObjectId(organizationId)) {
      return res.status(400).json({
        message: "Invalid organization ID.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const existingEmployeeId = await User.findOne({
      organizationId: organization._id,
      employeeId: normalizedEmployeeId,
    });

    if (existingEmployeeId) {
      return res.status(409).json({
        message:
          "This employee ID is already registered in this organization.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      organizationId: organization._id,
      employeeId: normalizedEmployeeId,
      approvalStatus: "pending",
    });

    return res.status(201).json({
      message: "Registration request submitted. Wait for admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        organizationId: user.organizationId,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("Employee registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email or employee ID is already registered.",
      });
    }

    return res.status(500).json({
      message: "Employee registration failed.",
    });
  }
});

// Admin saha approved employees lata login wenna
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Please provide email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Employee kenek approve wela nathnam login denna epa.
    // approvalStatus nathi old accounts walatath access denne naha.
    if (
      user.role === "user" &&
      user.approvalStatus !== "approved"
    ) {
      const statusMessage =
        user.approvalStatus === "rejected"
          ? "Your registration request was rejected. Contact your organization admin."
          : "Your registration request is pending admin approval.";

      return res.status(403).json({
        message: statusMessage,
        approvalStatus: user.approvalStatus || "pending",
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        message: "This account is not assigned to an organization.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        organizationId: user.organizationId.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId || null,
        organizationId: user.organizationId,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
});

// Admin ta pending employee requests balanna
router.get("/employee-requests", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only organization admins can view registration requests.",
      });
    }

    if (!req.user.organizationId) {
      return res.status(400).json({
        message: "Organization not found for this admin.",
      });
    }

    const requests = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "pending",
    })
      .select("name email employeeId approvalStatus createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(requests);
  } catch (error) {
    console.error("Get employee requests error:", error);

    return res.status(500).json({
      message: "Failed to load employee registration requests.",
    });
  }
});

// Admin kenek employee request approve/reject karanawa
router.patch(
  "/employee-requests/:id",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only organization admins can review requests.",
        });
      }

      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          message: "Status must be approved or rejected.",
        });
      }

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid employee request ID.",
        });
      }

      const employee = await User.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        role: "user",
        approvalStatus: "pending",
      });

      if (!employee) {
        return res.status(404).json({
          message:
            "Pending employee request not found in your organization.",
        });
      }

      employee.approvalStatus = status;
      await employee.save();

      return res.json({
        message: `Employee request ${status} successfully.`,
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          approvalStatus: employee.approvalStatus,
        },
      });
    } catch (error) {
      console.error("Review employee request error:", error);

      return res.status(500).json({
        message: "Failed to review employee request.",
      });
    }
  }
);

// Admin ta approved employees list eka balanna
router.get("/employees", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only organization admins can view employees.",
      });
    }

    const employees = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "approved",
    })
      .select("name email employeeId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(employees);
  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      message: "Failed to load employees.",
    });
  }
});
// EDIT EMPLOYEE
router.patch("/employees/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can edit employees.",
      });
    }

    const { name, email, employeeId } = req.body;

    if (!name?.trim() || !email?.trim() || !employeeId?.trim()) {
      return res.status(400).json({
        message: "Name, email and employee ID are required.",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "approved",
    });

    if (!employee) {
      return res.status(404).json({
        message: "Approved employee not found.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    const duplicateEmail = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: employee._id },
    });

    if (duplicateEmail) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const duplicateEmployeeId = await User.findOne({
      organizationId: req.user.organizationId,
      employeeId: normalizedEmployeeId,
      _id: { $ne: employee._id },
    });

    if (duplicateEmployeeId) {
      return res.status(409).json({
        message: "This employee ID is already used in your organization.",
      });
    }

    employee.name = name.trim();
    employee.email = normalizedEmail;
    employee.employeeId = normalizedEmployeeId;

    await employee.save();

    res.json({
      message: "Employee updated successfully.",
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    console.error("Edit employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or employee ID already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to update employee.",
    });
  }
});


// REMOVE EMPLOYEE
router.delete("/employees/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can remove employees.",
      });
    }

    const employee = await User.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: "user",
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found in your organization.",
      });
    }

    res.json({
      message: "Employee removed successfully.",
    });
  } catch (error) {
    console.error("Remove employee error:", error);

    res.status(500).json({
      message: "Failed to remove employee.",
    });
  }
});

module.exports = router;
