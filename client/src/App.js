
import React, { useEffect, useState } from "react";
import "./App.css";
import {
  getIncidents,
  createIncident,
  deleteIncident,
  updateIncident,
} from "./api/incidentApi";

const initialForm = {
  title: "",
  description: "",
  category: "Phishing",
  severity: "Medium",
};

function App() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadIncidents() {
    try {
      setError("");
      const data = await getIncidents();
      setIncidents(data);
    } catch (err) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await updateIncident(editingId, form);
        setMessage("Incident updated successfully.");
      } else {
        await createIncident(form);
        setMessage("Incident reported successfully.");
      }

      setForm(initialForm);
      setEditingId(null);
      await loadIncidents();
    } catch (err) {
      setError(err.message || "Unable to save the incident.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(incident) {
    setForm({
      title: incident.title,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
    });
    setEditingId(incident._id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this incident?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteIncident(id);
      setMessage("Incident deleted successfully.");
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
      await loadIncidents();
    } catch (err) {
      setError(err.message || "Unable to delete the incident.");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>SIMS</h1>
          <p>Security Incident Management System</p>
        </div>
        <span className="system-status">System Dashboard</span>
      </header>

      <main className="dashboard">
        <section className="welcome">
          <h2>Incident Dashboard</h2>
          <p>Monitor and manage reported security incidents.</p>
        </section>

        <section className="summary">
          <div className="summary-card">
            <p>Total Incidents</p>
            <h3>{incidents.length}</h3>
          </div>
          <div className="summary-card">
            <p>Open Incidents</p>
            <h3>
              {incidents.filter((item) => item.status === "Open").length}
            </h3>
          </div>
          <div className="summary-card">
            <p>Critical Incidents</p>
            <h3>
              {incidents.filter((item) => item.severity === "Critical").length}
            </h3>
          </div>
        </section>

        <section className="incident-section form-section">
          <h2>{editingId ? "Edit Incident" : "Report a Security Incident"}</h2>

          <form onSubmit={handleSubmit} className="incident-form">
            <label htmlFor="title">Incident Title</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter incident title"
              required
            />

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe what happened"
              rows="4"
              required
            />

            <div className="form-row">
              <div>
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option>Phishing</option>
                  <option>Malware</option>
                  <option>Unauthorized Access</option>
                  <option>Suspicious Activity</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity">Severity</label>
                <select
                  id="severity"
                  name="severity"
                  value={form.severity}
                  onChange={handleChange}
                  required
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Incident"
                  : "Report Incident"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                    setError("");
                    setMessage("");
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="incident-section">
          <h2>Reported Incidents</h2>

          {loading && <p>Loading incidents...</p>}

          {!loading && !error && incidents.length === 0 && (
            <p className="empty-message">
              No incidents have been reported yet.
            </p>
          )}

          {!loading && incidents.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident._id}>
                      <td>{incident.title}</td>
                      <td>{incident.category}</td>
                      <td>{incident.severity}</td>
                      <td>{incident.status}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => handleEdit(incident)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleDelete(incident._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
