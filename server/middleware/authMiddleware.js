
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Server configuration error.",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "role organizationId approvalStatus"
    );

    if (!user) {
      return res.status(401).json({
        message: "Account not found. Please log in again.",
      });
    }

    // Admin account ekata me approval check eka adala naha.
    // Employee kenek approved nathnam access denna epa.
    if (
      user.role === "user" &&
      user.approvalStatus !== "approved"
    ) {
      return res.status(403).json({
        message:
          user.approvalStatus === "rejected"
            ? "Your registration request was rejected. Contact your admin."
            : "Your registration request is pending admin approval.",
        approvalStatus: user.approvalStatus || "pending",
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organizationId
        ? user.organizationId.toString()
        : null,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication failed.",
    });
  }
}

module.exports = authMiddleware;
