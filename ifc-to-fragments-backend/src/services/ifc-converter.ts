// IFC to Fragments conversion service
import { IfcImporter } from "@thatopen/fragments";
import type { ConversionOptions, ConversionResult } from "../types/index.js";

export class IfcToFragmentsConverter {
  private ifcImporter: IfcImporter | null = null;
  private wasmPath: string;

  constructor(wasmPath: string = "./node_modules/web-ifc/") {
    this.wasmPath = wasmPath;
  }

  initialize(): void {
    try {
      this.ifcImporter = new IfcImporter();
      this.ifcImporter.wasm.path = this.wasmPath;
      this.ifcImporter.wasm.absolute = false;
      this.ifcImporter.webIfcSettings = {
        COORDINATE_TO_ORIGIN: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize IFC importer: ${message}`);
    }
  }

  async convert(
    ifcData: Uint8Array,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    if (!this.ifcImporter) {
      throw new Error("IFC importer not initialized. Call initialize() first.");
    }

    try {
      // Apply optional settings
      if (options.coordinateToOrigin !== undefined) {
        this.ifcImporter.webIfcSettings = {
          ...this.ifcImporter.webIfcSettings,
          COORDINATE_TO_ORIGIN: options.coordinateToOrigin,
        };
      }

      // Process the IFC data - returns Uint8Array directly
      const fragmentsData = await this.ifcImporter.process({
        bytes: ifcData,
      });

      return {
        data: fragmentsData,
        metadata: {
          name: options.name,
          timestamp: new Date().toISOString(),
          size: fragmentsData.byteLength,
          options,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to convert IFC to Fragments: ${message}`);
    }
  }

  cleanup(): void {
    if (this.ifcImporter) {
      // Reset the importer instance
      // The IfcImporter doesn't have a dispose method,
      // so we just release the reference
      this.ifcImporter = null;
    }
  }
}

// Export singleton instance
export const ifcConverter = new IfcToFragmentsConverter();
