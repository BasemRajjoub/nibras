#!/usr/bin/env node

/**
 * IFC to Fragments Converter - JavaScript Example
 *
 * This script demonstrates how to programmatically call the IFC to Fragments
 * conversion API using Node.js with ES modules.
 *
 * Usage:
 *   node convert-ifc.js <input.ifc> [output.frag] [options]
 *
 * Examples:
 *   node convert-ifc.js model.ifc
 *   node convert-ifc.js model.ifc output.frag
 *   node convert-ifc.js model.ifc output.frag --name=my-building
 *   node convert-ifc.js model.ifc output.frag --no-coordinate-to-origin
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_URL || "http://localhost:3000";
const CONVERT_ENDPOINT = `${API_BASE_URL}/api/convert`;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node convert-ifc.js <input.ifc> [output.frag] [options]");
    console.error("");
    console.error("Options:");
    console.error("  --name=<string>           Custom name for the model");
    console.error("  --no-coordinate-to-origin Disable coordinate centering");
    console.error("  --api-url=<url>           API base URL (default: http://localhost:3000)");
    console.error("");
    console.error("Examples:");
    console.error("  node convert-ifc.js model.ifc");
    console.error("  node convert-ifc.js model.ifc converted.frag");
    console.error('  node convert-ifc.js model.ifc --name="My Building"');
    process.exit(1);
  }

  const options = {
    inputFile: null,
    outputFile: null,
    name: null,
    coordinateToOrigin: true,
    apiUrl: API_BASE_URL,
  };

  for (const arg of args) {
    if (arg.startsWith("--name=")) {
      options.name = arg.substring(7);
    } else if (arg === "--no-coordinate-to-origin") {
      options.coordinateToOrigin = false;
    } else if (arg.startsWith("--api-url=")) {
      options.apiUrl = arg.substring(10);
    } else if (!arg.startsWith("--")) {
      if (!options.inputFile) {
        options.inputFile = arg;
      } else if (!options.outputFile) {
        options.outputFile = arg;
      }
    }
  }

  if (!options.inputFile) {
    console.error("Error: Input IFC file is required");
    process.exit(1);
  }

  // Set default output file name
  if (!options.outputFile) {
    const baseName = path.basename(options.inputFile, ".ifc");
    options.outputFile = `${baseName}.frag`;
  }

  return options;
}

/**
 * Check server health
 */
async function checkServerHealth(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    const health = await response.json();
    console.log(`Server status: ${health.status}`);
    console.log(`Server uptime: ${Math.round(health.uptime)} seconds`);
    return true;
  } catch (error) {
    console.error(`Error connecting to server: ${error.message}`);
    return false;
  }
}

/**
 * Convert IFC file to Fragments format
 */
async function convertIFC(inputPath, options = {}) {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Read the IFC file
  console.log(`Reading IFC file: ${inputPath}`);
  const fileBuffer = fs.readFileSync(inputPath);
  const fileStats = fs.statSync(inputPath);
  console.log(`File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Create FormData
  const formData = new FormData();

  // Create a Blob from the buffer
  const blob = new Blob([fileBuffer], { type: "application/x-step" });
  const fileName = path.basename(inputPath);
  formData.append("ifc", blob, fileName);

  // Add optional parameters
  if (options.name) {
    formData.append("name", options.name);
    console.log(`Model name: ${options.name}`);
  }

  if (options.coordinateToOrigin !== undefined) {
    formData.append("coordinateToOrigin", String(options.coordinateToOrigin));
    console.log(`Coordinate to origin: ${options.coordinateToOrigin}`);
  }

  // Send conversion request
  const apiUrl = options.apiUrl || CONVERT_ENDPOINT;
  const convertUrl = apiUrl.includes("/api/convert") ? apiUrl : `${apiUrl}/api/convert`;

  console.log(`\nSending conversion request to: ${convertUrl}`);
  console.log("Converting... This may take a moment for large files.");

  const startTime = Date.now();

  const response = await fetch(convertUrl, {
    method: "POST",
    body: formData,
  });

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Check for errors
  if (!response.ok) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || "Unknown error";
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(`Conversion failed: ${errorMessage}`);
  }

  // Extract metadata from headers
  const metadataHeader = response.headers.get("X-Fragments-Metadata");
  let metadata = null;
  if (metadataHeader) {
    try {
      metadata = JSON.parse(metadataHeader);
    } catch (e) {
      console.warn("Warning: Could not parse metadata header");
    }
  }

  // Get the binary response data
  const arrayBuffer = await response.arrayBuffer();
  const fragmentsData = new Uint8Array(arrayBuffer);

  console.log(`\nConversion completed in ${elapsedTime} seconds`);

  return {
    data: fragmentsData,
    metadata: metadata,
    elapsedTime: parseFloat(elapsedTime),
  };
}

/**
 * Save Fragments data to file
 */
function saveFragmentsFile(outputPath, data) {
  const buffer = Buffer.from(data);
  fs.writeFileSync(outputPath, buffer);
  const fileSize = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`Saved to: ${outputPath} (${fileSize} MB)`);
}

/**
 * Display conversion metadata
 */
function displayMetadata(metadata) {
  if (!metadata) {
    console.log("No metadata available");
    return;
  }

  console.log("\n--- Conversion Metadata ---");
  console.log(`Name: ${metadata.name || "N/A"}`);
  console.log(`Timestamp: ${metadata.timestamp}`);
  console.log(`Output size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
  if (metadata.options) {
    console.log(`Options: ${JSON.stringify(metadata.options)}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("=== IFC to Fragments Converter ===\n");

  // Parse command line arguments
  const options = parseArgs();

  // Check server health
  console.log(`Checking server at ${options.apiUrl}...`);
  const isHealthy = await checkServerHealth(options.apiUrl);
  if (!isHealthy) {
    console.error("\nServer is not available. Please ensure the server is running.");
    process.exit(1);
  }

  console.log("");

  try {
    // Convert the IFC file
    const result = await convertIFC(options.inputFile, {
      name: options.name,
      coordinateToOrigin: options.coordinateToOrigin,
      apiUrl: options.apiUrl,
    });

    // Save the result
    saveFragmentsFile(options.outputFile, result.data);

    // Display metadata
    displayMetadata(result.metadata);

    console.log("\n=== Conversion Successful ===");
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
