import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

export function errorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response) return "Cannot reach the SIMS API. Start the backend and check its database connection.";
  return error.message || "Request failed.";
}

export default api;
