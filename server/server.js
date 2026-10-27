const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

require("node:dns/promises").setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dotenv.config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const incidentRoutes = require("./routes/incidentRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Serve uploaded incident evidence images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/incidents", incidentRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "SIMS backend server is running.",
  });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`SIMS server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`Evidence images: http://localhost:${PORT}/uploads`);
    });
  } catch (error) {
    console.error("Failed to start SIMS server:", error.message);
    process.exit(1);
  }
}

startServer();