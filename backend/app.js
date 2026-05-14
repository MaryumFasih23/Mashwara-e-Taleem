import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createRequire } from "module";
import userRoutes from "./routes/userRoutes.js";
import universityRoutes from "./routes/universityRoutes.js";

const require = createRequire(import.meta.url);
const scholarshipRoutes = require("./scholarships/routes/scholarships.js");

const app = express();

// FIXED CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mashwara-e-taleem-iiq3.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

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

// ROUTES
app.use("/api/users", userRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/scholarships", scholarshipRoutes);

// DOCUMENT ANALYZER PROXY
app.use(
  "/api/document-analyzer",
  createProxyMiddleware({
    target: process.env.DOCUMENT_ANALYZER_API_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/document-analyzer": "",
    },
  })
);

// CHATBOT PROXY
app.use(
  "/api/chatbot",
  createProxyMiddleware({
    target: process.env.CHATBOT_API_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/chatbot": "",
    },
  })
);

export default app;