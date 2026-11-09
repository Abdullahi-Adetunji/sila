import express, { type Express, type Router } from "express";
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
import evaluatorRouter from "./routes/evaluator";

// The mount list is exported so the route-inventory test can enumerate
// every route with its true mount prefix. Add new routers here, not with
// a loose app.use() call.
export const MOUNTS: ReadonlyArray<{ prefix: string; router: Router }> = [
  { prefix: "/api/auth", router: authRouter },
  { prefix: "/api/me", router: meRouter },
  { prefix: "/api/partner", router: partnerRouter },
  { prefix: "/api/consent", router: consentRouter },
  { prefix: "/api/couple", router: coupleRouter },
  { prefix: "/api/me", router: auditRouter },
  { prefix: "/api/counsellor", router: counsellorRouter },
  { prefix: "/api/demo", router: demoRouter },
  { prefix: "/api/dev", router: devRouter },
  { prefix: "/api/relatives", router: relativesRouter },
  { prefix: "/api/referrals", router: referralsRouter },
  { prefix: "/api/volunteer", router: volunteerRouter },
  { prefix: "/api/evaluator", router: evaluatorRouter },
];

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  for (const m of MOUNTS) {
    app.use(m.prefix, m.router);
  }
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
