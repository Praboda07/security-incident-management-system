
import React, { useState } from "react";
import "./Register.css";
import DigitalGlobe from "./DigitalGlobe.js";



const API_URL = "http://localhost:5000/api/auth";

const emptyForm = {
  organizationName: "",
  organizationEmail: "",
  organizationId: "",
  employeeId: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function Register({ onRegisterSuccess, onShowLogin }) {
  const [mode, setMode] = useState("join");
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    const payload =
      mode === "organization"
        ? {
            organizationName: form.organizationName.trim(),
            organizationEmail: form.organizationEmail.trim(),
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            organizationId: form.organizationId.trim(),
            employeeId: form.employeeId.trim(),
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          };

    const endpoint =
      mode === "organization"
        ? "/register-organization"
        : "/register";

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      if (mode === "organization") {
        setMessage(
          data.message ||
            "Organization registered successfully. You can now log in."
        );
      } else {
        setMessage(
          data.message ||
            "Registration request submitted. Wait for admin approval."
        );
      }

      setForm(emptyForm);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <main className="register-page">
  <DigitalGlobe />

  <div className="register-background register-background-one" />
  <div className="register-background register-background-two" />

  {/* Keep your existing register-card and form here */}
</main>
      <div className="register-background register-background-one" />
      <div className="register-background register-background-two" />

      <section className="register-card">
        <div className="register-brand">
          <div className="register-brand-icon" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              width="30"
              height="30"
              fill="none"
            >
              <path
                d="M24 4L40 10V22C40 32 33 39 24 44C15 39 8 32 8 22V10L24 4Z"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M17 24L22 29L32 18"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1>Join SIMS</h1>
          <p className="register-subtitle">
            Security Incident Management System
          </p>
        </div>

        <div className="register-tabs" role="tablist" aria-label="Registration type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "organization"}
            className={`register-tab ${
              mode === "organization" ? "selected" : ""
            }`}
            onClick={() => changeMode("organization")}
          >
            <span className="register-tab-icon" aria-hidden="true">
              ◈
            </span>
            <span>Register Organization</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            className={`register-tab ${
              mode === "join" ? "selected" : ""
            }`}
            onClick={() => changeMode("join")}
          >
            <span className="register-tab-icon" aria-hidden="true">
              +
            </span>
            <span>Join Organization</span>
          </button>
        </div>

        <div className="register-heading">
          <h2>
            {mode === "organization"
              ? "Create your organization"
              : "Create your employee account"}
          </h2>

          <p>
            {mode === "organization"
              ? "Set up your organization and administrator account."
              : "Enter your organization's details to request access."}
          </p>
        </div>

        {error && (
          <div className="register-alert register-alert-error" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div
            className="register-alert register-alert-success"
            role="status"
          >
            <span aria-hidden="true">✓</span>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          {mode === "organization" ? (
            <>
              <div className="register-field">
                <label htmlFor="organizationName">
                  Organization Name
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  value={form.organizationName}
                  onChange={handleChange}
                  placeholder="Enter your organization name"
                  autoComplete="organization"
                  required
                  disabled={loading}
                />
              </div>

              <div className="register-field">
                <label htmlFor="organizationEmail">
                  Organization Email
                </label>
                <input
                  id="organizationEmail"
                  name="organizationEmail"
                  type="email"
                  value={form.organizationEmail}
                  onChange={handleChange}
                  placeholder="company@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              <div className="register-field">
                <label htmlFor="organizationId">Organization ID</label>
                <input
                  id="organizationId"
                  name="organizationId"
                  type="text"
                  value={form.organizationId}
                  onChange={handleChange}
                  placeholder="Enter your organization ID"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
                <small>
                  Ask your organization administrator for this ID.
                </small>
              </div>

              <div className="register-field">
                <label htmlFor="employeeId">Employee ID</label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="Enter your company employee ID"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="register-field">
            <label htmlFor="name">
              {mode === "organization"
                ? "Administrator Full Name"
                : "Employee Full Name"}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={100}
              required
              disabled={loading}
            />
          </div>

          <div className="register-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="register-field">
            <label htmlFor="password">Password</label>
            <div className="register-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="register-password-wrap">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter password again"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                disabled={loading}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="register-spinner" />
                Processing...
              </>
            ) : mode === "organization" ? (
              "Create Organization"
            ) : (
              "Submit Registration Request"
            )}
            {!loading && <span aria-hidden="true">→</span>}
          </button>

          {mode === "join" && (
            <p className="register-approval-note">
              <span aria-hidden="true">ⓘ</span>
              Your account will be available after admin approval.
            </p>
          )}
        </form>

        <div className="register-footer">
          <span>Already have an account?</span>
          <button
            type="button"
            className="register-login-link"
            onClick={onShowLogin || onRegisterSuccess}
          >
            Log in
            <span aria-hidden="true"> →</span>
          </button>
        </div>

        <p className="register-security-note">
          <span aria-hidden="true">🔒</span>
          Secure registration · SIMS
        </p>
      </section>
    </main>
  );
}

export default Register;
