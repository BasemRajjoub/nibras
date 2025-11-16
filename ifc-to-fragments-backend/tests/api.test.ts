// Integration tests for API endpoints
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import { join } from "path";

// Mock the @thatopen/fragments module before importing the app
jest.unstable_mockModule("@thatopen/fragments", () => ({
  IfcImporter: jest.fn().mockImplementation(() => ({
    wasm: { path: "", absolute: false },
    webIfcSettings: {},
    includeUniqueAttributes: false,
    includeRelationNames: false,
    classes: {
      elements: new Set<number>(),
      abstract: new Set<number>(),
    },
    relations: new Map<number, { forRelating: string; forRelated: string }>(),
    process: jest.fn<() => Promise<Uint8Array>>().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
  })),
}));

// Import after mocking
const { default: app } = await import("../src/app.js");
const { ifcConverter } = await import("../src/services/ifc-converter.js");
const { setupUploadsDirectory, cleanupUploadsDirectory, getFixturePath } = await import("./setup.js");

describe("API Integration Tests", () => {
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(async () => {
    setupUploadsDirectory();
    await ifcConverter.initialize();
    // Suppress console.error during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    await ifcConverter.cleanup();
    cleanupUploadsDirectory();
    consoleErrorSpy.mockRestore();
  });

  afterEach(() => {
    cleanupUploadsDirectory();
  });

  describe("GET /health", () => {
    it("should return 200 with health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
    });

    it("should return uptime as a number", async () => {
      const response = await request(app).get("/health");

      expect(typeof response.body.uptime).toBe("number");
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should return timestamp in ISO format", async () => {
      const response = await request(app).get("/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe("GET /api/status", () => {
    it("should return converter status", async () => {
      const response = await request(app).get("/api/status");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("ready", true);
      expect(response.body).toHaveProperty("service", "IFC to Fragments Converter");
      expect(response.body).toHaveProperty("version", "1.0.0");
    });
  });

  describe("POST /api/convert", () => {
    it("should return 400 if no file uploaded", async () => {
      const response = await request(app).post("/api/convert");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("status", "fail");
      expect(response.body.message).toContain("No IFC file uploaded");
    });

    it("should return 400 if wrong field name used", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("wrongfield", getFixturePath("sample.ifc"));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("status", "fail");
    });

    it("should return 400 for invalid file type", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", Buffer.from("not an ifc file"), "test.txt");

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Only IFC files are allowed");
    });

    it("should return 400 for non-IFC extension", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", Buffer.from("some data"), "model.obj");

      expect(response.status).toBe(400);
    });

    it("should accept IFC file with correct extension", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"));

      // With our mock, this should succeed
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/octet-stream");
      expect(response.headers["content-disposition"]).toContain("attachment");
    });

    it("should set correct content-length header", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"));

      expect(response.status).toBe(200);
      expect(response.headers["content-length"]).toBe("5"); // Mock returns 5 bytes
    });

    it("should include metadata in X-Fragments-Metadata header", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"))
        .field("name", "TestModel");

      expect(response.status).toBe(200);
      expect(response.headers["x-fragments-metadata"]).toBeDefined();

      const metadata = JSON.parse(response.headers["x-fragments-metadata"]);
      expect(metadata).toHaveProperty("name", "TestModel");
      expect(metadata).toHaveProperty("timestamp");
      expect(metadata).toHaveProperty("size", 5);
    });

    it("should use original filename as name when not provided", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"));

      expect(response.status).toBe(200);
      const metadata = JSON.parse(response.headers["x-fragments-metadata"]);
      expect(metadata.name).toBe("sample");
    });

    it("should handle coordinateToOrigin option", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"))
        .field("coordinateToOrigin", "false");

      expect(response.status).toBe(200);
      const metadata = JSON.parse(response.headers["x-fragments-metadata"]);
      expect(metadata.options.coordinateToOrigin).toBe(false);
    });

    it("should set correct content-disposition filename", async () => {
      const response = await request(app)
        .post("/api/convert")
        .attach("ifc", getFixturePath("sample.ifc"))
        .field("name", "MyBuilding");

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("MyBuilding.frag");
    });
  });

  describe("404 Not Found", () => {
    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get("/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("status", "fail");
      expect(response.body.message).toContain("not found");
    });

    it("should return 404 for invalid API routes", async () => {
      const response = await request(app).get("/api/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("status", "fail");
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON in request body", async () => {
      const response = await request(app)
        .post("/api/convert")
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      expect(response.status).toBe(400);
    });

    it("should handle CORS headers", async () => {
      const response = await request(app).get("/health");

      // CORS middleware is applied, so the server should accept the request
      expect(response.status).toBe(200);
    });
  });
});
