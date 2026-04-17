const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const scholarshipRoutes = require("./routes/scholarships");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/scholarships", scholarshipRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "unavailable",
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled request error:", err);
  res.status(500).json({ error: "Unexpected server error" });
});

mongoose.set("bufferCommands", false);

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not configured. Cache reads and writes will be skipped.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  connectMongo();
});

module.exports = app;
