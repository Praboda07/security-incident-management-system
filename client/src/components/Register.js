
import React, { useState } from "react";
import {
  registerOrganization,
  registerUser,
} from "../api/authApi";

function Register({ onRegisterSuccess, onShowLogin }) {
  const [mode, setMode] = useState("organization");

  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "organization") {
        await registerOrganization({
          organizationName,
          organizationEmail,
          name,
          email,
          password,
        });

        setSuccess(
          "Organization registered successfully. You can now log in as its admin."
        );

        setOrganizationName("");
        setOrganizationEmail("");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        await registerUser({
          name,
          email,
          password,
          organizationId: organizationId.trim(),
          employeeId: employeeId.trim(),
        });

        setSuccess(
          "Registration request submitted successfully. Please wait for admin approval before logging in."
        );

        setOrganizationId("");
        setEmployeeId("");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>
          {mode === "organization"
            ? "Register Organization"
            : "Join Organization"}
        </h1>

        <p>
          {mode === "organization"
            ? "Create an organization and its admin account."
            : "Submit your employee registration for admin approval."}
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className="auth-link"
            onClick={() => handleModeChange("organization")}
          >
            Register Organization
          </button>
          {" | "}
          <button
            type="button"
            className="auth-link"
            onClick={() => handleModeChange("employee")}
          >
            Join Organization
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {success && (
          <div className="auth-success">
            <p>{success}</p>

            <button
              type="button"
              className="auth-link"
              onClick={onShowLogin}
            >
              Go to Login
            </button>
          </div>
        )}

        {mode === "organization" && (
          <>
            <label>Organization Name</label>
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
              required
            />

            <label>Organization Email</label>
            <input
              type="email"
              value={organizationEmail}
              onChange={(e) => setOrganizationEmail(e.target.value)}
              placeholder="Enter organization email"
              required
            />
          </>
        )}

        {mode === "employee" && (
          <>
            <label>Organization ID</label>
            <input
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="Enter your organization ID"
              required
            />

            <label>Employee ID</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter your company employee ID"
              required
            />
          </>
        )}

        <label>
          {mode === "organization" ? "Admin Full Name" : "Employee Full Name"}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Enter password again"
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "organization"
              ? "Register Organization"
              : "Submit Registration Request"}
        </button>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            className="auth-link"
            onClick={onShowLogin}
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

export default Register;
