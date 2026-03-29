import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import universityRoutes from "./routes/universityRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/universities", universityRoutes);

export default app;
