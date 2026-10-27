const API_URL = "http://localhost:5000/api/incidents";

async function request(url, options = {}) {
  const savedAuth = sessionStorage.getItem("simsAuth");
  const auth = savedAuth ? JSON.parse(savedAuth) : null;

  const headers = {
    ...(options.headers || {}),
    ...(auth?.token
      ? { Authorization: `Bearer ${auth.token}` }
      : {}),
  };

  const isFormData = options.body instanceof FormData;

  if (isFormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function getIncidents() {
  return request(API_URL);
}

export async function createIncident(incidentData) {
  const isFormData = incidentData instanceof FormData;

  return request(API_URL, {
    method: "POST",
    headers: isFormData
      ? {}
      : { "Content-Type": "application/json" },
    body: isFormData
      ? incidentData
      : JSON.stringify(incidentData),
  });
}

export async function updateIncident(id, incidentData) {
  const isFormData = incidentData instanceof FormData;

  return request(`${API_URL}/${id}`, {
    method: "PUT",
    headers: isFormData
      ? {}
      : { "Content-Type": "application/json" },
    body: isFormData
      ? incidentData
      : JSON.stringify(incidentData),
  });
}

export async function deleteIncident(id) {
  return request(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}