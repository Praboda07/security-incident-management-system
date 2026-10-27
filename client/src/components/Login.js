
import React, { useState } from "react";
import "./Login.css";
import DigitalGlobe from "./DigitalGlobe";

function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid email or password."
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          "Login response is missing the user or token."
        );
      }

      // Send the successful login response to App.js.
      if (typeof onLogin === "function") {
        onLogin(data);
      } else {
        throw new Error("Login handler is not configured.");
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <DigitalGlobe />

      <div className="login-background login-background-one" />
      <div className="login-background login-background-two" />

      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden="true">
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

          <span className="login-eyebrow">SECURE ACCESS</span>

          <h1>Welcome Back</h1>

          <p>Sign in to your SIMS account.</p>
        </div>

        {error && (
          <div className="login-alert" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">
              Email Address
            </label>

            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">
              Password
            </label>

            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                required
                disabled={loading}
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={loading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Login
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="login-register-footer">
          <span>Don't have an account?</span>

          <button
            type="button"
            className="login-register-link"
            onClick={onShowRegister}
          >
            Register <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="login-security-note">
          <span aria-hidden="true">🔒</span>
          Your access is protected by SIMS
        </div>
      </section>
    </main>
  );
}

export default Login;
