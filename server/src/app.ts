import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRouter from "./routes/auth";
import meRouter from "./routes/me";
import partnerRouter from "./routes/partner";
import consentRouter from "./routes/consent";
import coupleRouter from "./routes/couple";
import auditRouter from "./routes/audit";
import counsellorRouter from "./routes/counsellor";
import demoRouter from "./routes/demo";
import devRouter from "./routes/dev";
import relativesRouter from "./routes/relatives";
import referralsRouter from "./routes/referrals";
import volunteerRouter from "./routes/volunteer";

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/partner", partnerRouter);
  app.use("/api/consent", consentRouter);
  app.use("/api/couple", coupleRouter);
  app.use("/api/me", auditRouter);
  app.use("/api/counsellor", counsellorRouter);
  app.use("/api/demo", demoRouter);
  app.use("/api/dev", devRouter);
  app.use("/api/relatives", relativesRouter);
  app.use("/api/referrals", referralsRouter);
  app.use("/api/volunteer", volunteerRouter);
  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      res.status(500).json({ error: "internal error" });
    },
  );
  return app;
}
