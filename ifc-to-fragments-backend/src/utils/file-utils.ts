// File utility functions
import { readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

/**
 * Read a file and return its contents as a Uint8Array
 */
export async function readFileAsUint8Array(filePath: string): Promise<Uint8Array> {
  const buffer = await readFile(filePath);
  return new Uint8Array(buffer);
}

/**
 * Delete a temporary file
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    // Ignore errors if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Failed to delete temp file ${filePath}:`, error);
    }
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}
