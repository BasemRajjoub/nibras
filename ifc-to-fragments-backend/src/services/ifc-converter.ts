// IFC to Fragments conversion service
import { IfcImporter } from "@thatopen/fragments";
import * as WEBIFC from "web-ifc";
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

      // Enable inclusion of unique attributes and relation names
      this.ifcImporter.includeUniqueAttributes = true;
      this.ifcImporter.includeRelationNames = true;

      // Add property-related IFC classes to abstract classes
      // These are needed to include IFC properties in the conversion
      const propertyClasses = [
        WEBIFC.IFCPROPERTYSET,
        WEBIFC.IFCPROPERTYSINGLEVALUE,
        WEBIFC.IFCPROPERTYLISTVALUE,
        WEBIFC.IFCPROPERTYENUMERATEDVALUE,
        WEBIFC.IFCPROPERTYBOUNDEDVALUE,
        WEBIFC.IFCPROPERTYTABLEVALUE,
        WEBIFC.IFCPROPERTYREFERENCEVALUE,
        WEBIFC.IFCPROPERTYSETDEFINITION,
        WEBIFC.IFCPROPERTYDEFINITION,
        WEBIFC.IFCPROPERTY,
        WEBIFC.IFCELEMENTQUANTITY,
        WEBIFC.IFCQUANTITYLENGTH,
        WEBIFC.IFCQUANTITYAREA,
        WEBIFC.IFCQUANTITYVOLUME,
        WEBIFC.IFCQUANTITYWEIGHT,
        WEBIFC.IFCQUANTITYCOUNT,
      ];

      for (const classId of propertyClasses) {
        this.ifcImporter.classes.abstract.add(classId);
      }

      // Ensure IFCRELDEFINESBYPROPERTIES is included in relations
      // This relationship connects elements to their property sets
      if (!this.ifcImporter.relations.has(WEBIFC.IFCRELDEFINESBYPROPERTIES)) {
        this.ifcImporter.relations.set(WEBIFC.IFCRELDEFINESBYPROPERTIES, {
          forRelating: "RelatingPropertyDefinition",
          forRelated: "RelatedObjects",
        });
      }
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
