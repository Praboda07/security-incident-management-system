
const API_URL = "http://localhost:5000/api/incidents";

export async function getIncidents() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch incidents");
  }

  return response.json();
}

export async function createIncident(incidentData) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(incidentData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create incident");
  }

  return data;
}

export async function updateIncident(id, incidentData) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(incidentData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update incident");
  }

  return data;
}

export async function deleteIncident(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete incident");
  }

  return data;
}
