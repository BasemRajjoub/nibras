// Express application configuration
import express, { Application } from "express";
import cors from "cors";
import convertRoutes from "./routes/convert.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount API routes
app.use("/api", convertRoutes);

// Handle 404 - Route not found
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
