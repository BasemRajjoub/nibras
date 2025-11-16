// Error handling middleware
import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

/**
 * Custom error class for application errors
 */
export class ApiError extends Error implements AppError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // Log error for debugging
  console.error(`[Error] ${statusCode} - ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Handle multer errors
  if (err.name === "MulterError") {
    res.status(400).json({
      status: "fail",
      message: `File upload error: ${err.message}`,
    });
    return;
  }

  // Handle JSON parsing errors
  if (err.name === "SyntaxError" && "body" in err) {
    res.status(400).json({
      status: "fail",
      message: "Invalid JSON in request body",
    });
    return;
  }

  // Send error response
  res.status(statusCode).json({
    status,
    message: err.isOperational ? err.message : "Internal server error",
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
}

/**
 * Handle 404 - Route not found
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: "fail",
    message: `Route ${req.originalUrl} not found`,
  });
}
