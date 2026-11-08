import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRouter from "./routes/auth";

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
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
