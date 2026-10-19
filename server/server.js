
const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");

require("dotenv").config();

const connectDB = require("./config/db");
const incidentRoutes = require("./routes/incidentRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/incidents", incidentRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "SIMS backend is running",
    status: "success"
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`SIMS backend running on port ${PORT}`);
  });
};

startServer();
