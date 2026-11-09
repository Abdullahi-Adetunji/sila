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

  // Hardened security headers. CSP for the API responses is strict by default
  // because the API only ever returns JSON. The Next.js app sets its own
  // page-level CSP (see next.config.ts).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 60 * 60 * 24 * 365,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "no-referrer" },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use((_req, res, next) => {
    // Permissions-Policy is not in helmet's defaults.
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=()",
    );
    next();
  });

  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  for (const m of MOUNTS) {
    app.use(m.prefix, m.router);
  }
  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  // Central error handler. In production the response is a short string with
  // no stack trace. Server-side we still log the full error.
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "internal error" });
        return;
      }
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: "internal error", message });
    },
  );
  return app;
}
