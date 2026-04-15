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

// Proxy document-analyzer calls to Python FastAPI (port 8001)
app.use(
  "/api/document-analyzer",
  createProxyMiddleware({
    target: "http://localhost:8001",
    changeOrigin: true,
  })
);

// Proxy chatbot calls to Python FastAPI chatbot (port 8002)
app.use(
  "/api/chatbot",
  createProxyMiddleware({
    target: "http://localhost:8002",
    changeOrigin: true,
    pathRewrite: { "^/api/chatbot": "" },
  })
);

export default app;