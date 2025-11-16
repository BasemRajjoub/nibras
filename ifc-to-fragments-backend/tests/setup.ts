// Test environment setup
import { mkdirSync, existsSync, rmSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.PORT = "3001";

// Test uploads directory
const TEST_UPLOADS_DIR = join(process.cwd(), "uploads");

/**
 * Ensure the uploads directory exists for tests
 */
export function setupUploadsDirectory(): void {
  if (!existsSync(TEST_UPLOADS_DIR)) {
    mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Clean up uploaded files after tests
 */
export function cleanupUploadsDirectory(): void {
  if (existsSync(TEST_UPLOADS_DIR)) {
    const files = readdirSync(TEST_UPLOADS_DIR);
    for (const file of files) {
      const filePath = join(TEST_UPLOADS_DIR, file);
      try {
        unlinkSync(filePath);
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}

/**
 * Remove the entire uploads directory
 */
export function removeUploadsDirectory(): void {
  if (existsSync(TEST_UPLOADS_DIR)) {
    try {
      rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Get the path to a test fixture file
 */
export function getFixturePath(filename: string): string {
  return join(process.cwd(), "tests", "fixtures", filename);
}

// Global setup - runs before all tests
setupUploadsDirectory();

// Global cleanup - ensure clean state
export const globalCleanup = (): void => {
  cleanupUploadsDirectory();
};
