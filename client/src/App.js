
import React, { useEffect, useState } from "react";
import "./App.css";

import Login from "./components/Login";
import Register from "./components/Register";

import {
  getIncidents,
  createIncident,
  deleteIncident,
  updateIncident,
} from "./api/incidentApi";

import { getEmployees } from "./api/authApi";

const API_URL = "http://localhost:5000/api/auth";

const initialForm = {
  title: "",
  description: "",
  category: "Phishing",
  severity: "Medium",
};

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = sessionStorage.getItem("simsAuth");

    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      sessionStorage.removeItem("simsAuth");
      return null;
    }
  });

  const [page, setPage] = useState("login");
  const [activeSection, setActiveSection] = useState("incidents");

  // Theme settings
  const [theme, setTheme] = useState(() => {
    return sessionStorage.getItem("simsTheme") || "light";
  });

  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [rejectedEmployees, setRejectedEmployees] = useState([]);
  const [archivedEmployees, setArchivedEmployees] = useState([]);

  const [archiveLoading, setArchiveLoading] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const isAuthenticated = Boolean(auth?.token);
  const isAdmin = auth?.user?.role === "admin";

  // Toggle light and dark mode
  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme =
        currentTheme === "light" ? "dark" : "light";

      sessionStorage.setItem("simsTheme", nextTheme);

      return nextTheme;
    });
  }

  async function loadIncidents() {
    setLoading(true);

    try {
      const data = await getIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    setEmployeeLoading(true);
    setError("");

    try {
      const data = await getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load employees.");
    } finally {
      setEmployeeLoading(false);
    }
  }

  async function loadRejectedEmployees() {
    if (!auth?.token || !isAdmin) return;

    setRejectedLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/rejected-employees`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load rejected employees."
        );
      }

      setRejectedEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message || "Failed to load rejected employees."
      );
    } finally {
      setRejectedLoading(false);
    }
  }

  async function loadArchivedEmployees() {
    if (!auth?.token || !isAdmin) return;

    setArchiveLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/archived-employees`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load archived employees."
        );
      }

      setArchivedEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message || "Failed to load archived employees."
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  async function loadEmployeeRequests() {
    if (!auth?.token || !isAdmin) return;

    setRequestsLoading(true);
    setRequestError("");

    try {
      const response = await fetch(
        `${API_URL}/employee-requests`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load registration requests."
        );
      }

      setEmployeeRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setRequestError(
        err.message || "Failed to load registration requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadIncidents();
    } else {
      setLoading(false);
    }
    // Load incidents when authentication changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function handleLogin(data) {
    const authData = {
      token: data.token,
      user: data.user,
    };

    sessionStorage.setItem("simsAuth", JSON.stringify(authData));

    setAuth(authData);
    setPage("dashboard");
    setActiveSection("incidents");
    setError("");
    setMessage("");
    setRequestError("");
    setRequestMessage("");
  }

  function handleLogout() {
    sessionStorage.removeItem("simsAuth");

    setAuth(null);
    setPage("login");
    setActiveSection("incidents");
    setIncidents([]);
    setEmployees([]);
    setEmployeeRequests([]);
    setRejectedEmployees([]);
    setArchivedEmployees([]);
    setForm(initialForm);
    setEditingId(null);
    setError("");
    setMessage("");
    setRequestError("");
    setRequestMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleStatusChange(incident, newStatus) {
    if (!isAdmin || newStatus === incident.status) return;

    setError("");
    setMessage("");

    try {
      await updateIncident(incident._id, {
        status: newStatus,
      });

      setMessage("Incident status updated successfully.");
      await loadIncidents();
    } catch (err) {
      setError(
        err.message || "Failed to update incident status."
      );
    }
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

  async function openEmployeeManagement() {
    setActiveSection("employees");
    setError("");
    setMessage("");
    setRequestError("");
    setRequestMessage("");

    await Promise.all([
      loadEmployees(),
      loadEmployeeRequests(),
      loadRejectedEmployees(),
      loadArchivedEmployees(),
    ]);
  }

  async function reviewEmployeeRequest(id, status) {
    if (!auth?.token || !isAdmin) return;

    setReviewingId(id);
    setRequestError("");
    setRequestMessage("");

    try {
      const response = await fetch(
        `${API_URL}/employee-requests/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update registration request."
        );
      }

      setRequestMessage(
        status === "approved"
          ? "Employee registration approved successfully."
          : "Employee registration rejected successfully."
      );

      await Promise.all([
        loadEmployeeRequests(),
        loadEmployees(),
        loadRejectedEmployees(),
      ]);
    } catch (err) {
      setRequestError(
        err.message || "Failed to update registration request."
      );
    } finally {
      setReviewingId(null);
    }
  }

  async function editEmployee(employee) {
    const name = window.prompt(
      "Enter employee name:",
      employee.name
    );
    if (name === null) return;

    const email = window.prompt(
      "Enter employee email:",
      employee.email
    );
    if (email === null) return;

    const employeeId = window.prompt(
      "Enter employee ID:",
      employee.employeeId || ""
    );
    if (employeeId === null) return;

    try {
      const response = await fetch(
        `${API_URL}/employees/${employee._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            name,
            email,
            employeeId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to edit employee."
        );
      }

      setMessage("Employee updated successfully.");
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Failed to edit employee.");
    }
  }

  async function removeEmployee(employee) {
    const confirmed = window.confirm(
      `Archive employee ${employee.name}? You can restore this account later.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/employees/${employee._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to remove employee."
        );
      }

      setMessage(
        "Employee archived successfully. You can restore this employee from Archived Employees."
      );

      await Promise.all([
        loadEmployees(),
        loadArchivedEmployees(),
      ]);
    } catch (err) {
      setError(err.message || "Failed to remove employee.");
    }
  }

  async function restoreEmployee(employee) {
    const confirmed = window.confirm(
      `Restore ${employee.name}'s account?`
    );

    if (!confirmed) return;

    setRestoringId(employee._id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/archived-employees/${employee._id}/restore`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to restore employee."
        );
      }

      setMessage("Employee restored successfully.");

      await Promise.all([
        loadEmployees(),
        loadArchivedEmployees(),
      ]);
    } catch (err) {
      setError(err.message || "Failed to restore employee.");
    } finally {
      setRestoringId(null);
    }
  }

  if (!isAuthenticated && page === "register") {
    return (
      <Register
        onRegisterSuccess={() => setPage("login")}
        onShowLogin={() => setPage("login")}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setPage("register")}
      />
    );
  }

  const totalIncidents = incidents.length;

  const openIncidents = incidents.filter(
    (item) => item.status === "Open"
  ).length;

  const criticalIncidents = incidents.filter(
    (item) => item.severity === "Critical"
  ).length;

  const inProgressIncidents = incidents.filter(
    (item) => item.status === "In Progress"
  ).length;

  const resolvedIncidents = incidents.filter(
    (item) => item.status === "Resolved"
  ).length;

  return (
    <div className="app" data-theme={theme}>
      <header className="header">
        <div>
          <h1>SIMS</h1>
          <p>Security Incident Management System</p>
        </div>

        <div className="header-user">
          <span className="system-status">
            Welcome, {auth.user?.name || "User"}
            {isAdmin ? " (Admin)" : " (Employee)"}
          </span>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle dashboard theme"
          >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome">
          <h2>
            {isAdmin ? "Admin Dashboard" : "Employee Dashboard"}
          </h2>

          <p>
            {isAdmin
              ? "Monitor and manage your organization's security incidents."
              : "Report security incidents and track your reported complaints."}
          </p>
        </section>

        {isAdmin && (
          <nav className="dashboard-nav">
            <button
              type="button"
              className={
                activeSection === "incidents" ? "active" : ""
              }
              onClick={() => {
                setActiveSection("incidents");
                setError("");
                setMessage("");
              }}
            >
              Incident Management
            </button>

            <button
              type="button"
              className={
                activeSection === "employees" ? "active" : ""
              }
              onClick={openEmployeeManagement}
            >
              Employee Management
            </button>
          </nav>
        )}

        <section className="summary">
          <div className="summary-card">
            <p>Total Incidents</p>
            <h3>{totalIncidents}</h3>
          </div>

          <div className="summary-card">
            <p>Open Incidents</p>
            <h3>{openIncidents}</h3>
          </div>

          <div className="summary-card">
            <p>Critical Incidents</p>
            <h3>{criticalIncidents}</h3>
          </div>

          {isAdmin && (
            <>
              <div className="summary-card">
                <p>In Progress</p>
                <h3>{inProgressIncidents}</h3>
              </div>

              <div className="summary-card">
                <p>Resolved Incidents</p>
                <h3>{resolvedIncidents}</h3>
              </div>
            </>
          )}
        </section>

        {error && <p className="error">{error}</p>}
        {message && (
          <p className="success-message">{message}</p>
        )}

        {!isAdmin && (
          <section className="incident-section form-section">
            <h2>
              {editingId
                ? "Edit Incident"
                : "Report a Security Incident"}
            </h2>

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
        )}

        {isAdmin && activeSection === "employees" && (
          <>
            <section className="incident-section">
              <h2>Employee Registration Requests</h2>

              <p>
                Review employee registrations before allowing them to log in.
              </p>

              {requestError && (
                <p className="error">{requestError}</p>
              )}

              {requestMessage && (
                <p className="success-message">
                  {requestMessage}
                </p>
              )}

              <button
                type="button"
                onClick={loadEmployeeRequests}
                disabled={requestsLoading}
              >
                {requestsLoading ? "Loading..." : "Refresh Requests"}
              </button>

              {requestsLoading && (
                <p>Loading registration requests...</p>
              )}

              {!requestsLoading &&
                !requestError &&
                employeeRequests.length === 0 && (
                  <p className="empty-message">
                    No pending employee registration requests.
                  </p>
                )}

              {!requestsLoading && employeeRequests.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                        <th>Requested Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {employeeRequests.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || "-"}</td>
                          <td>
                            {employee.createdAt
                              ? new Date(
                                  employee.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                disabled={reviewingId === employee._id}
                                onClick={() =>
                                  reviewEmployeeRequest(
                                    employee._id,
                                    "approved"
                                  )
                                }
                              >
                                {reviewingId === employee._id
                                  ? "Please wait..."
                                  : "Approve"}
                              </button>

                              <button
                                type="button"
                                className="delete-button"
                                disabled={reviewingId === employee._id}
                                onClick={() =>
                                  reviewEmployeeRequest(
                                    employee._id,
                                    "rejected"
                                  )
                                }
                              >
                                Reject
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

            <section className="incident-section">
              <h2>Employee Management</h2>
              <p>Employees in your organization.</p>

              {employeeLoading && <p>Loading employees...</p>}

              {!employeeLoading && employees.length === 0 && (
                <p className="empty-message">
                  No employees have joined your organization yet.
                </p>
              )}

              {!employeeLoading && employees.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>
                            {employee.createdAt
                              ? new Date(
                                  employee.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="edit-button"
                                onClick={() => editEmployee(employee)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="delete-button"
                                onClick={() => removeEmployee(employee)}
                              >
                                Remove
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

            <section className="incident-section">
              <h2>Rejected Employees</h2>
              <p>
                Employee registration requests rejected by an admin.
              </p>

              <button
                type="button"
                onClick={loadRejectedEmployees}
                disabled={rejectedLoading}
              >
                {rejectedLoading
                  ? "Loading..."
                  : "Refresh Rejected Employees"}
              </button>

              {rejectedLoading && (
                <p>Loading rejected employees...</p>
              )}

              {!rejectedLoading && rejectedEmployees.length === 0 && (
                <p className="empty-message">
                  No rejected employees found.
                </p>
              )}

              {!rejectedLoading && rejectedEmployees.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                        <th>Rejected / Requested Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rejectedEmployees.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || "-"}</td>
                          <td>
                            {employee.createdAt
                              ? new Date(
                                  employee.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="incident-section">
              <h2>Archived Employees</h2>
              <p>
                Employees removed by an admin. Restore an account if it was
                removed by mistake.
              </p>

              <button
                type="button"
                onClick={loadArchivedEmployees}
                disabled={archiveLoading}
              >
                {archiveLoading
                  ? "Loading..."
                  : "Refresh Archived Employees"}
              </button>

              {archiveLoading && (
                <p>Loading archived employees...</p>
              )}

              {!archiveLoading && archivedEmployees.length === 0 && (
                <p className="empty-message">
                  No archived employees found.
                </p>
              )}

              {!archiveLoading && archivedEmployees.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                        <th>Removed Date</th>
                        <th>Removed By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {archivedEmployees.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || "-"}</td>
                          <td>
                            {employee.deletedAt
                              ? new Date(
                                  employee.deletedAt
                                ).toLocaleString()
                              : "-"}
                          </td>
                          <td>
                            {employee.deletedBy?.name ||
                              employee.deletedBy?.email ||
                              "-"}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="edit-button"
                              disabled={restoringId === employee._id}
                              onClick={() => restoreEmployee(employee)}
                            >
                              {restoringId === employee._id
                                ? "Restoring..."
                                : "Restore"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {(!isAdmin || activeSection === "incidents") && (
          <section className="incident-section">
            <h2>
              {isAdmin
                ? "Organization Incidents"
                : "My Reported Incidents"}
            </h2>

            {loading && <p>Loading incidents...</p>}

            {!loading && incidents.length === 0 && (
              <p className="empty-message">
                {isAdmin
                  ? "No incidents have been reported in your organization yet."
                  : "You have not reported any incidents yet."}
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

                        <td>
                          {isAdmin ? (
                            <select
                              aria-label={`Status for ${incident.title}`}
                              value={incident.status}
                              onChange={(event) =>
                                handleStatusChange(
                                  incident,
                                  event.target.value
                                )
                              }
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">
                                In Progress
                              </option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          ) : (
                            incident.status
                          )}
                        </td>

                        <td>
                          <div className="table-actions">
                            {!isAdmin && (
                              <button
                                type="button"
                                className="edit-button"
                                onClick={() => handleEdit(incident)}
                              >
                                Edit
                              </button>
                            )}

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
        )}
      </main>
    </div>
  );
}

export default App;
