import React, { useEffect, useState } from "react";
import "./App.css";

import Login from "./components/Login";
import Register from "./components/Register";
import { Sun, Moon } from "lucide-react";
import {
  getIncidents,
  createIncident,
  deleteIncident,
  updateIncident,
} from "./api/incidentApi";

import { getEmployees } from "./api/authApi";

const API_URL = "https://venom-gifted-polar-bear.abasthan.app/api/auth";

const initialForm = {
  title: "",
  description: "",
  category: "Phishing",
  severity: "Medium",
};

function App() {
  const [theme, setTheme] = useState(() => {
  return sessionStorage.getItem("simsTheme") || "light";
});

function toggleTheme() {
  setTheme((currentTheme) => {
    const nextTheme =
      currentTheme === "light" ? "dark" : "light";

    sessionStorage.setItem("simsTheme", nextTheme);
    return nextTheme;
  });
}
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

  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [rejectedEmployees, setRejectedEmployees] = useState([]);
  const [archivedEmployees, setArchivedEmployees] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [reviewingId, setReviewingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [reAddingId, setReAddingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const isAuthenticated = Boolean(auth?.token);
  const isAdmin = auth?.user?.role === "admin";

  async function apiRequest(path, options = {}) {
    if (!auth?.token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${auth.token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  async function loadIncidents() {
    setLoading(true);

    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (err) {
      setError(err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    setEmployeeLoading(true);

    try {
      const data = await getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load employees.");
    } finally {
      setEmployeeLoading(false);
    }
  }

  async function loadEmployeeRequests() {
    if (!auth?.token || !isAdmin) return;

    setRequestsLoading(true);
    setRequestError("");

    try {
      const data = await apiRequest("/employee-requests");
      setEmployeeRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setRequestError(err.message || "Failed to load registration requests.");
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadRejectedEmployees() {
    if (!auth?.token || !isAdmin) return;

    setRejectedLoading(true);
    setRequestError("");

    try {
      const data = await apiRequest("/rejected-employees");
      setRejectedEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setRequestError(err.message || "Failed to load rejected employees.");
    } finally {
      setRejectedLoading(false);
    }
  }

  async function loadArchivedEmployees() {
    if (!auth?.token || !isAdmin) return;

    setArchiveLoading(true);
    setRequestError("");

    try {
      const data = await apiRequest("/archived-employees");
      setArchivedEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setRequestError(err.message || "Failed to load archived employees.");
    } finally {
      setArchiveLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadIncidents();
    } else {
      setLoading(false);
    }
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
      await updateIncident(incident._id, { status: newStatus });

      setMessage("Incident status updated successfully.");
      await loadIncidents();
    } catch (err) {
      setError(err.message || "Failed to update incident status.");
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
      await apiRequest(`/employee-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

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
    const name = window.prompt("Enter employee name:", employee.name);
    if (name === null) return;

    const email = window.prompt("Enter employee email:", employee.email);
    if (email === null) return;

    const employeeId = window.prompt(
      "Enter employee ID:",
      employee.employeeId || ""
    );
    if (employeeId === null) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/employees/${employee._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, email, employeeId }),
      });

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
      await apiRequest(`/employees/${employee._id}`, {
        method: "DELETE",
      });

      setMessage("Employee archived successfully.");

      await Promise.all([
        loadEmployees(),
        loadArchivedEmployees(),
      ]);
    } catch (err) {
      setError(err.message || "Failed to archive employee.");
    }
  }

  // Re-add a rejected employee to the pending approval list.
  async function reAddRejectedEmployee(employee) {
    const confirmed = window.confirm(
      `Re-add ${employee.name} and send the registration request for approval?`
    );

    if (!confirmed) return;

    setReAddingId(employee._id);
    setRequestError("");
    setRequestMessage("");

    try {
      const data = await apiRequest(
        `/rejected-employees/${employee._id}/re-add`,
        { method: "PATCH" }
      );

      setRequestMessage(data.message || "Employee re-added for approval.");

      await Promise.all([
        loadRejectedEmployees(),
        loadEmployeeRequests(),
      ]);
    } catch (err) {
      setRequestError(err.message || "Failed to re-add employee.");
    } finally {
      setReAddingId(null);
    }
  }

  // Restore an archived employee account.
  async function restoreEmployee(employee) {
    const confirmed = window.confirm(
      `Restore ${employee.name}'s archived account?`
    );

    if (!confirmed) return;

    setRestoringId(employee._id);
    setRequestError("");
    setRequestMessage("");

    try {
      const data = await apiRequest(
        `/archived-employees/${employee._id}/restore`,
        { method: "PATCH" }
      );

      setRequestMessage(data.message || "Employee restored successfully.");

      await Promise.all([
        loadArchivedEmployees(),
        loadEmployees(),
        loadEmployeeRequests(),
        loadRejectedEmployees(),
      ]);
    } catch (err) {
      setRequestError(err.message || "Failed to restore employee.");
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
          <h1>SecureTrack 🛡️</h1>
          <p>Protect your organization with confidence.</p>
        </div>

        <div className="header-user">
          <span className="system-status">
            Welcome, {auth.user?.name || "User"}
            {isAdmin ? " (Admin)" : " (Employee)"}
          </span>

         
          <button
  type="button"
  className="theme-toggle icon-only"
  onClick={toggleTheme}
  aria-label={
    theme === "light" ? "Switch to dark mode" : "Switch to light mode"
  }
  title={theme === "light" ? "Dark Mode" : "Light Mode"}
>
  {theme === "light" ? (
    <Moon size={21} strokeWidth={1.8} />
  ) : (
    <Sun size={21} strokeWidth={1.8} />
  )}
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
          <h2>{isAdmin ? "Admin Dashboard" : "Employee Dashboard"}</h2>

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
              className={activeSection === "incidents" ? "active" : ""}
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
              className={activeSection === "employees" ? "active" : ""}
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
        {message && <p className="success-message">{message}</p>}

        {!isAdmin && (
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
            {/* Pending registration requests */}
            <section className="incident-section">
              <h2>Employee Registration Requests</h2>
              <p>Review employee registrations before allowing them to log in.</p>

              {requestError && <p className="error">{requestError}</p>}
              {requestMessage && (
                <p className="success-message">{requestMessage}</p>
              )}

              <button
                type="button"
                onClick={loadEmployeeRequests}
                disabled={requestsLoading}
              >
                {requestsLoading ? "Loading..." : "Refresh Requests"}
              </button>

              {requestsLoading && <p>Loading registration requests...</p>}

              {!requestsLoading && employeeRequests.length === 0 && (
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
                              ? new Date(employee.createdAt).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                disabled={reviewingId === employee._id}
                                onClick={() =>
                                  reviewEmployeeRequest(employee._id, "approved")
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
                                  reviewEmployeeRequest(employee._id, "rejected")
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

            {/* Approved employees */}
            <section className="incident-section">
              <h2>Employee Management</h2>
              <p>Employees in your organization.</p>

              <button type="button" onClick={loadEmployees}>
                Refresh Employees
              </button>

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
                        <th>Employee ID</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || "-"}</td>
                          <td>
                            {employee.createdAt
                              ? new Date(employee.createdAt).toLocaleDateString()
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

            {/* Rejected employees */}
            <section className="incident-section">
              <h2>Rejected Employees</h2>
              <p>
                Registration requests rejected by an admin. Re-add an employee
                to send the request for approval again.
              </p>

              <button
                type="button"
                onClick={loadRejectedEmployees}
                disabled={rejectedLoading}
              >
                {rejectedLoading ? "Loading..." : "Refresh Rejected Employees"}
              </button>

              {rejectedLoading && <p>Loading rejected employees...</p>}

              {!rejectedLoading && rejectedEmployees.length === 0 && (
                <p className="empty-message">No rejected employees found.</p>
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
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rejectedEmployees.map((employee) => (
                        <tr key={employee._id}>
                          <td>{employee.name}</td>
                          <td>{employee.email}</td>
                          <td>{employee.employeeId || "-"}</td>
                          <td>
                            {employee.updatedAt
                              ? new Date(employee.updatedAt).toLocaleDateString()
                              : employee.createdAt
                              ? new Date(employee.createdAt).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <button
                              type="button"
                              disabled={reAddingId === employee._id}
                              onClick={() => reAddRejectedEmployee(employee)}
                            >
                              {reAddingId === employee._id
                                ? "Please wait..."
                                : "Re-add Employee"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Archived employees */}
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
                {archiveLoading ? "Loading..." : "Refresh Archived Employees"}
              </button>

              {archiveLoading && <p>Loading archived employees...</p>}

              {!archiveLoading && archivedEmployees.length === 0 && (
                <p className="empty-message">No archived employees found.</p>
              )}

              {!archiveLoading && archivedEmployees.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                        <th>Archived Date</th>
                        <th>Action</th>
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
                              ? new Date(employee.deletedAt).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <button
                              type="button"
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

        {/* Incidents */}
        {(!isAdmin || activeSection === "incidents") && (
          <section className="incident-section">
            <h2>
              {isAdmin ? "Organization Incidents" : "My Reported Incidents"}
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
                                handleStatusChange(incident, event.target.value)
                              }
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
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