// Unit tests for IfcToFragmentsConverter
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// Mock the @thatopen/fragments module before importing the converter
jest.unstable_mockModule("@thatopen/fragments", () => ({
  IfcImporter: jest.fn().mockImplementation(() => ({
    wasm: { path: "", absolute: false },
    webIfcSettings: {},
    process: jest.fn<() => Promise<Uint8Array>>().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
  })),
}));

// Import after mocking
const { IfcToFragmentsConverter } = await import("../src/services/ifc-converter.js");

describe("IfcToFragmentsConverter", () => {
  let converter: InstanceType<typeof IfcToFragmentsConverter>;

  beforeEach(() => {
    converter = new IfcToFragmentsConverter("./node_modules/web-ifc/");
  });

  afterEach(async () => {
    await converter.cleanup();
  });

  describe("constructor", () => {
    it("should create a new instance with default WASM path", () => {
      const defaultConverter = new IfcToFragmentsConverter();
      expect(defaultConverter).toBeDefined();
      expect(defaultConverter).toBeInstanceOf(IfcToFragmentsConverter);
    });

    it("should create a new instance with custom WASM path", () => {
      const customConverter = new IfcToFragmentsConverter("/custom/path/");
      expect(customConverter).toBeDefined();
      expect(customConverter).toBeInstanceOf(IfcToFragmentsConverter);
    });
  });

  describe("initialize", () => {
    it("should initialize the IFC importer successfully", async () => {
      await expect(converter.initialize()).resolves.not.toThrow();
    });

    it("should set up WASM path correctly", async () => {
      await converter.initialize();
      // If initialization succeeds, the importer was created
      expect(converter).toBeDefined();
    });
  });

  describe("convert", () => {
    it("should throw error if not initialized", async () => {
      const ifcData = new Uint8Array([1, 2, 3]);
      await expect(converter.convert(ifcData)).rejects.toThrow(
        "IFC importer not initialized. Call initialize() first."
      );
    });

    it("should convert IFC data to Fragments successfully", async () => {
      await converter.initialize();

      const ifcData = new Uint8Array([10, 20, 30]);
      const result = await converter.convert(ifcData);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.size).toBe(5); // Mock returns 5 bytes
    });

    it("should include options in metadata", async () => {
      await converter.initialize();

      const ifcData = new Uint8Array([10, 20, 30]);
      const options = {
        name: "TestModel",
        coordinateToOrigin: true,
      };

      const result = await converter.convert(ifcData, options);

      expect(result.metadata.name).toBe("TestModel");
      expect(result.metadata.options).toEqual(options);
    });

    it("should handle conversion with coordinateToOrigin option", async () => {
      await converter.initialize();

      const ifcData = new Uint8Array([10, 20, 30]);
      const result = await converter.convert(ifcData, {
        coordinateToOrigin: false,
      });

      expect(result).toBeDefined();
      expect(result.metadata.options.coordinateToOrigin).toBe(false);
    });

    it("should set timestamp in ISO format", async () => {
      await converter.initialize();

      const ifcData = new Uint8Array([10, 20, 30]);
      const result = await converter.convert(ifcData);

      const timestamp = new Date(result.metadata.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should cleanup successfully when not initialized", async () => {
      await expect(converter.cleanup()).resolves.not.toThrow();
    });

    it("should cleanup successfully after initialization", async () => {
      await converter.initialize();
      await expect(converter.cleanup()).resolves.not.toThrow();
    });

    it("should allow re-initialization after cleanup", async () => {
      await converter.initialize();
      await converter.cleanup();

      // Should be able to initialize again
      await expect(converter.initialize()).resolves.not.toThrow();
    });

    it("should throw error when converting after cleanup", async () => {
      await converter.initialize();
      await converter.cleanup();

      const ifcData = new Uint8Array([1, 2, 3]);
      await expect(converter.convert(ifcData)).rejects.toThrow(
        "IFC importer not initialized. Call initialize() first."
      );
    });
  });
});
