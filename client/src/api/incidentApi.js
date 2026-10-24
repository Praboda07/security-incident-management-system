
const API_URL = "http://localhost:5000/api/incidents";

async function request(url, options = {}) {
  const savedAuth = sessionStorage.getItem("simsAuth");
  const auth = savedAuth ? JSON.parse(savedAuth) : null;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(auth?.token
        ? { Authorization: `Bearer ${auth.token}` }
        : {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function getIncidents() {
  return request(API_URL);
}

export async function createIncident(incidentData) {
  return request(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(incidentData),
  });
}

export async function updateIncident(id, incidentData) {
  return request(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(incidentData),
  });
}

export async function deleteIncident(id) {
  return request(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}
