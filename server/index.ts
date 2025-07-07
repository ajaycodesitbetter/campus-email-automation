import "dotenv/config";
// Force redeploy: 2025-07-01T16:03:47Z - After updating env vars

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { db } from "./db";
import { setupVite } from "./vite";

// Define log function
const log = console.log;

// Optimize for faster cold starts
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const app = express();

// CORS configuration for frontend communication
app.use((req, res, next) => {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://automailsrcem.netlify.app'] 
    : ['http://localhost:5173', 'http://localhost:5000'];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration for authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'campus-email-session-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Disable secure for now to fix cross-origin issues
    httpOnly: false, // Allow client-side access for debugging
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Allow cross-origin cookies
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesnt interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  }
  // In production, this is an API-only server
  // Frontend is served separately via Netlify

  // Use environment PORT or default to 5000
  // Railway and other platforms provide PORT via environment
  const port = parseInt(process.env.PORT || "5000");
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  
  server.listen({
    port,
    host
  }, () => {
    log(`serving on port ${port}`);
  });
})();
