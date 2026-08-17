import express from "express";
import type { Request, Response } from "express";
import authRoute from "./routes/authRoute.js";
import cors from "cors";
import { env } from "./lib/env.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
const app = express();
const PORT = env.PORT;
app.all("/api/auth/*",toNodeHandler(auth))
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
  }),
);
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Working" });
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT  ${PORT}`);
});
