import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import userRoutes from "./routes/userRoutes.js";
import universityRoutes from "./routes/universityRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/universities", universityRoutes);

// Proxy document-analyzer calls to the Python FastAPI service (port 8001)
app.use(
  "/api/document-analyzer",
  createProxyMiddleware({
    target: "http://localhost:8001",
    changeOrigin: true,
  })
);

export default app;