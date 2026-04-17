import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createRequire } from "module";
import userRoutes from "./routes/userRoutes.js";
import universityRoutes from "./routes/universityRoutes.js";

const require = createRequire(import.meta.url);
const scholarshipRoutes = require("./scholarships/routes/scholarships.js");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Mashwar-e-Taleem backend is running",
    docs: {
      users: "/api/users",
      universities: "/api/universities",
      scholarships: "/api/scholarships",
      documentAnalyzer: "/api/document-analyzer",
      chatbot: "/api/chatbot",
      health: "/health",
    },
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/users", userRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/scholarships", scholarshipRoutes);

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