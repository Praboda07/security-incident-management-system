const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Organization = require("../models/organization");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function adminOnly(req, res) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required." });
    return false;
  }
  return true;
}

// Register an organization and its admin.
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

    if (await Organization.findOne({ email: normalizedOrganizationEmail })) {
      return res.status(409).json({
        message: "An organization with this email already exists.",
      });
    }

    if (await User.findOne({ email: normalizedEmail })) {
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

    return res.status(500).json({
      message: "Organization registration failed.",
    });
  }
});

// Employee registration.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, organizationId, employeeId } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !organizationId ||
      !employeeId?.trim()
    ) {
      return res.status(400).json({
        message: "Please provide all required employee details.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!mongoose.isValidObjectId(organizationId)) {
      return res.status(400).json({ message: "Invalid organization ID." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message:
          "This email already has an account. Contact the organization admin if you need access restored.",
      });
    }

    const existingEmployeeId = await User.findOne({
      organizationId: organization._id,
      employeeId: normalizedEmployeeId,
    });

    if (existingEmployeeId) {
      return res.status(409).json({
        message:
          "This employee ID is already registered. Contact the organization admin to restore the existing account if needed.",
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
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
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

// Login.
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

    if (user.isDeleted) {
      return res.status(403).json({
        message: "This account has been archived. Contact your admin.",
      });
    }

    if (
      user.role === "user" &&
      user.approvalStatus !== "approved"
    ) {
      return res.status(403).json({
        message:
          user.approvalStatus === "rejected"
            ? "Your registration was rejected. Contact your admin."
            : "Your registration is waiting for admin approval.",
        approvalStatus: user.approvalStatus,
      });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        message: "This account is not assigned to an organization.",
      });
    }

    if (!process.env.JWT_SECRET) {
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
        approvalStatus: user.approvalStatus || "approved",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed." });
  }
});

// Get pending registration requests.
router.get("/employee-requests", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    const requests = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "pending",
      isDeleted: { $ne: true },
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

// Approve or reject a registration request.
router.patch("/employee-requests/:id", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "pending",
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Pending employee request not found.",
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
});

// Get approved employees.
router.get("/employees", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    const employees = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "approved",
      isDeleted: { $ne: true },
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

// Edit an approved employee.
router.patch("/employees/:id", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const { name, email, employeeId } = req.body;

    if (!name?.trim() || !email?.trim() || !employeeId?.trim()) {
      return res.status(400).json({
        message: "Name, email, and employee ID are required.",
      });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "approved",
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: employee._id },
    });

    if (emailExists) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const employeeIdExists = await User.findOne({
      organizationId: req.user.organizationId,
      employeeId: normalizedEmployeeId,
      _id: { $ne: employee._id },
    });

    if (employeeIdExists) {
      return res.status(409).json({
        message: "Employee ID is already in use in this organization.",
      });
    }

    employee.name = name.trim();
    employee.email = normalizedEmail;
    employee.employeeId = normalizedEmployeeId;
    await employee.save();

    return res.json({
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
        message: "Email or employee ID is already in use.",
      });
    }

    return res.status(500).json({ message: "Failed to edit employee." });
  }
});

// Archive instead of permanently deleting an employee.
router.delete("/employees/:id", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const employee = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "approved",
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    employee.isDeleted = true;
    employee.deletedAt = new Date();
    employee.deletedBy = req.user.userId;
    await employee.save();

    return res.json({
      message: "Employee archived successfully.",
    });
  } catch (error) {
    console.error("Archive employee error:", error);
    return res.status(500).json({
      message: "Failed to archive employee.",
    });
  }
});

// Get rejected employees.
router.get("/rejected-employees", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    const employees = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      approvalStatus: "rejected",
      isDeleted: { $ne: true },
    })
      .select("name email employeeId approvalStatus createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(employees);
  } catch (error) {
    console.error("Get rejected employees error:", error);
    return res.status(500).json({
      message: "Failed to load rejected employees.",
    });
  }
});

// Re-add a rejected employee by sending their existing request back to pending.
router.patch(
  "/rejected-employees/:id/re-add",
  authMiddleware,
  async (req, res) => {
    try {
      if (!adminOnly(req, res)) return;

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid employee ID." });
      }

      const employee = await User.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        role: "user",
        approvalStatus: "rejected",
        isDeleted: { $ne: true },
      });

      if (!employee) {
        return res.status(404).json({
          message: "Rejected employee not found.",
        });
      }

      employee.approvalStatus = "pending";
      await employee.save();

      return res.json({
        message: "Employee re-added for admin approval.",
      });
    } catch (error) {
      console.error("Re-add rejected employee error:", error);
      return res.status(500).json({
        message: "Failed to re-add rejected employee.",
      });
    }
  }
);

// Get archived employees.
router.get("/archived-employees", authMiddleware, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;

    const employees = await User.find({
      organizationId: req.user.organizationId,
      role: "user",
      isDeleted: true,
    })
      .select("name email employeeId approvalStatus createdAt deletedAt")
      .sort({ deletedAt: -1 })
      .lean();

    return res.json(employees);
  } catch (error) {
    console.error("Get archived employees error:", error);
    return res.status(500).json({
      message: "Failed to load archived employees.",
    });
  }
});

// Restore an archived employee.
router.patch(
  "/archived-employees/:id/restore",
  authMiddleware,
  async (req, res) => {
    try {
      if (!adminOnly(req, res)) return;

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid employee ID." });
      }

      const employee = await User.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        role: "user",
        isDeleted: true,
      });

      if (!employee) {
        return res.status(404).json({
          message: "Archived employee not found.",
        });
      }

      // Restore the account, but require approval if it was not approved before.
      employee.isDeleted = false;
      employee.deletedAt = null;
      employee.deletedBy = null;

      if (!employee.approvalStatus) {
        employee.approvalStatus = "pending";
      }

      await employee.save();

      return res.json({
        message:
          employee.approvalStatus === "approved"
            ? "Employee restored successfully."
            : "Employee restored. Admin approval is still required.",
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          approvalStatus: employee.approvalStatus,
        },
      });
    } catch (error) {
      console.error("Restore employee error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "This employee ID conflicts with another active account. Edit the employee ID before restoring.",
        });
      }

      return res.status(500).json({
        message: "Failed to restore employee.",
      });
    }
  }
);

module.exports = router;