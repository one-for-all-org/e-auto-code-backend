import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { notFound, errorHandler } from "./middlewares/error";
import { globalLimiter } from "./middlewares/rateLimit";
import routes from "./routes";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(globalLimiter);
app.use("/api", routes);

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ success: true, data: null, message: "API OK" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
