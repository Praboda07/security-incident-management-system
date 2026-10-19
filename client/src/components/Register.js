
import React, { useState } from "react";
import { registerUser } from "../api/authApi";

function Register({ onRegisterSuccess, onShowLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({ name, email, password });
      setMessage("Registration successful! Please log in.");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p>Register to report and track security incidents.</p>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <label>Full Name</label>
        <input
          type="text"
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
          {loading ? "Creating account..." : "Register"}
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
