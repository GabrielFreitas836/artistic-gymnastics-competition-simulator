import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Restrict CORS to known origins only — never allow a wildcard in production.
// REPLIT_DOMAINS is a comma-separated list of authorised host names set by the platform.
const allowedOrigins = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .flatMap((d) => [`https://${d}`, `http://${d}`]);

// Always allow localhost for local development
allowedOrigins.push("http://localhost", "http://localhost:3000", "http://localhost:5173");

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (e.g. server-to-server) have no Origin header — allow them.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
// extended: false uses the simpler querystring parser — avoids nested-object
// prototype-pollution risks that come with extended: true (qs library).
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use("/api", router);

export default app;
