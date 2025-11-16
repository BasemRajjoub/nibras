// Main application entry point
import app from "./app.js";
import { ifcConverter } from "./services/ifc-converter.js";

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    // Initialize the IFC converter
    console.log("Initializing IFC converter...");
    await ifcConverter.initialize();
    console.log("IFC converter initialized successfully");

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API base URL: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("HTTP server closed");

        try {
          // Cleanup converter resources
          await ifcConverter.cleanup();
          console.log("IFC converter cleaned up");
        } catch (error) {
          console.error("Error during cleanup:", error);
        }

        console.log("Shutdown complete");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Register shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      shutdown("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
