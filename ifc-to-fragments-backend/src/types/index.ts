// Type definitions

export interface ConversionOptions {
  coordinateToOrigin?: boolean;
  name?: string;
  excludedCategories?: number[];
  includeProperties?: boolean;
}

export interface ConversionResult {
  data: Uint8Array;
  metadata: {
    name?: string;
    timestamp: string;
    size: number;
    options: ConversionOptions;
  };
}
