const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Organization = require("../models/organization");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Helper: admin authorization
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Only organization admins can perform this action.",
    });
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      message: "Your account is not linked to an organization.",
    });
  }

  next();
}

// =====================================================
// 1. REGISTER ORGANIZATION AND ADMIN
// POST /api/auth/register-organization
// =====================================================

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
      isDeleted: false,
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

// =====================================================
// 2. EMPLOYEE REGISTER / RE-REGISTER
// POST /api/auth/register
// =====================================================

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

    const existingEmailUser = await User.findOne({
      email: normalizedEmail,
    });

    const existingEmployeeUser = await User.findOne({
      organizationId: organization._id,
      employeeId: normalizedEmployeeId,
    });

    // Permit re-registration only for the same rejected account.
    if (existingEmailUser || existingEmployeeUser) {
      const sameRejectedAccount =
        existingEmailUser &&
        existingEmployeeUser &&
        existingEmailUser._id.equals(existingEmployeeUser._id) &&
        existingEmailUser.role === "user" &&
        existingEmailUser.organizationId &&
        existingEmailUser.organizationId.equals(organization._id) &&
        existingEmailUser.approvalStatus === "rejected" &&
        existingEmailUser.isDeleted !== true;

      if (!sameRejectedAccount) {
        return res.status(409).json({
          message:
            "This email or employee ID is already registered. Rejected employees must apply again using the same email, employee ID, and organization.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      existingEmailUser.name = name.trim();
      existingEmailUser.password = hashedPassword;
      existingEmailUser.approvalStatus = "pending";

      await existingEmailUser.save();

      return res.status(200).json({
        message:
          "Your registration request has been submitted again. Please wait for admin approval.",
        user: {
          id: existingEmailUser._id,
          name: existingEmailUser.name,
          email: existingEmailUser.email,
          employeeId: existingEmailUser.employeeId,
          organizationId: existingEmailUser.organizationId,
          approvalStatus: existingEmailUser.approvalStatus,
        },
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

// =====================================================
// 3. LOGIN
// POST /api/auth/login
// =====================================================

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

    if (user.isDeleted === true) {
      return res.status(403).json({
        message: "This account has been archived. Contact your admin.",
      });
    }

    if (user.role === "user" && user.approvalStatus !== "approved") {
      const statusMessage =
        user.approvalStatus === "rejected"
          ? "Your registration request was rejected. You can register again using the same email and employee ID."
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

// =====================================================
// 4. GET PENDING EMPLOYEE REQUESTS
// GET /api/auth/employee-requests
// =====================================================

router.get(
  "/employee-requests",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
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
  }
);

// =====================================================
// 5. APPROVE OR REJECT EMPLOYEE REQUEST
// PATCH /api/auth/employee-requests/:id
// =====================================================

router.patch(
  "/employee-requests/:id",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
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
        isDeleted: { $ne: true },
      });

      if (!employee) {
        return res.status(404).json({
          message: "Pending employee request not found in your organization.",
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

// =====================================================
// 6. GET APPROVED EMPLOYEES
// GET /api/auth/employees
// =====================================================

router.get(
  "/employees",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
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
  }
);

// =====================================================
// 7. EDIT APPROVED EMPLOYEE
// PATCH /api/auth/employees/:id
// =====================================================

router.patch(
  "/employees/:id",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
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
        isDeleted: { $ne: true },
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
          message: "Email or employee ID already exists.",
        });
      }

      return res.status(500).json({
        message: "Failed to update employee.",
      });
    }
  }
);

// =====================================================
// 8. ARCHIVE EMPLOYEE
// DELETE /api/auth/employees/:id
// =====================================================

router.delete(
  "/employees/:id",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
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
        return res.status(404).json({
          message: "Employee not found in your organization.",
        });
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
  }
);

// =====================================================
// 9. GET REJECTED EMPLOYEES
// GET /api/auth/rejected-employees
// =====================================================

router.get(
  "/rejected-employees",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const employees = await User.find({
        organizationId: req.user.organizationId,
        role: "user",
        approvalStatus: "rejected",
        isDeleted: { $ne: true },
      })
        .select("name email employeeId approvalStatus createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return res.json(employees);
    } catch (error) {
      console.error("Get rejected employees error:", error);

      return res.status(500).json({
        message: "Failed to load rejected employees.",
      });
    }
  }
);

// =====================================================
// 10. GET ARCHIVED EMPLOYEES
// GET /api/auth/archived-employees
// =====================================================

router.get(
  "/archived-employees",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const employees = await User.find({
        organizationId: req.user.organizationId,
        role: "user",
        isDeleted: true,
      })
        .select(
          "name email employeeId approvalStatus createdAt deletedAt deletedBy"
        )
        .sort({ deletedAt: -1 })
        .lean();

      return res.json(employees);
    } catch (error) {
      console.error("Get archived employees error:", error);

      return res.status(500).json({
        message: "Failed to load archived employees.",
      });
    }
  }
);

// =====================================================
// 11. RESTORE ARCHIVED EMPLOYEE
// PATCH /api/auth/archived-employees/:id/restore
// =====================================================

router.patch(
  "/archived-employees/:id/restore",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
        });
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

      const duplicateEmail = await User.findOne({
        email: employee.email,
        _id: { $ne: employee._id },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          message:
            "Another account is using this email. Resolve the duplicate before restoring.",
        });
      }

      const duplicateEmployeeId = await User.findOne({
        organizationId: employee.organizationId,
        employeeId: employee.employeeId,
        _id: { $ne: employee._id },
      });

      if (duplicateEmployeeId) {
        return res.status(409).json({
          message:
            "Another account is using this employee ID. Resolve the duplicate before restoring.",
        });
      }

      employee.isDeleted = false;
      employee.deletedAt = undefined;
      employee.deletedBy = undefined;

      await employee.save();

      return res.json({
        message: "Employee restored successfully.",
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

      return res.status(500).json({
        message: "Failed to restore employee.",
      });
    }
  }
);
// Re-add a rejected employee for approval
router.patch(
  "/rejected-employees/:id/re-add",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
        });
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

      return res.status(200).json({
        message: "Employee has been moved back to pending approval.",
      });
    } catch (error) {
      console.error("Re-add rejected employee error:", error);

      return res.status(500).json({
        message: "Failed to re-add rejected employee.",
      });
    }
  }
);

module.exports = router;