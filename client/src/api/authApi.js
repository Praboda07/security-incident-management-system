
const API_URL = "http://localhost:5000/api/auth";

export async function registerOrganization(organizationData) {
  const response = await fetch(`${API_URL}/register-organization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(organizationData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Organization registration failed.");
  }

  return data;
}

export async function registerUser(userData) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed.");
  }

  return data;
}

export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  return data;
}

export async function getEmployees() {
  const savedAuth = sessionStorage.getItem("simsAuth");
  const auth = savedAuth ? JSON.parse(savedAuth) : null;

  const response = await fetch(`${API_URL}/employees`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth?.token || ""}`,
      Accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Backend did not return JSON. Check the employees route in authRoutes.js and the backend server."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load employees.");
  }

  return data;
}
