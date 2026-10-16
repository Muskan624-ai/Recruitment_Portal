import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { errorHandler, notFound } from "./middleware/error";
import authRouter from "./routes/auth";
import publicRouter from "./routes/public";
import meRouter from "./routes/me";
import formRouter from "./routes/form";
import statusRouter from "./routes/status";
import slotsRouter from "./routes/slots";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api", publicRouter);
app.use("/api", meRouter);
app.use("/api/form", formRouter);
app.use("/api/status", statusRouter);
app.use("/api/slots", slotsRouter);

app.use(notFound);
app.use(errorHandler);