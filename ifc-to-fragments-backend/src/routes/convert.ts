// Conversion API routes
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { ifcConverter } from "../services/ifc-converter.js";
import { readFileAsUint8Array, deleteTempFile, ensureDirectoryExists } from "../utils/file-utils.js";
import { ApiError } from "../middleware/error-handler.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    ensureDirectoryExists(uploadDir)
      .then(() => {
        cb(null, uploadDir);
      })
      .catch((error: Error) => {
        cb(error, uploadDir);
      });
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept IFC files
    if (
      file.mimetype === "application/x-step" ||
      file.originalname.toLowerCase().endsWith(".ifc")
    ) {
      cb(null, true);
    } else {
      cb(new ApiError("Only IFC files are allowed", 400));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

/**
 * POST /convert
 * Convert an IFC file to Fragments format
 */
router.post(
  "/convert",
  upload.single("ifc"),
  (req: Request, res: Response, next: NextFunction): void => {
    let filePath: string | null = null;

    const processConversion = async (): Promise<void> => {
      if (!req.file) {
        throw new ApiError("No IFC file uploaded. Please upload a file with field name 'ifc'", 400);
      }

      filePath = req.file.path;

      // Read the uploaded IFC file as Uint8Array
      const ifcData = await readFileAsUint8Array(filePath);

      // Extract options from request body with type safety
      const body = req.body as Record<string, unknown>;
      const options = {
        name: (typeof body.name === "string" ? body.name : req.file.originalname.replace(".ifc", "")),
        coordinateToOrigin: body.coordinateToOrigin !== "false",
      };

      // Convert IFC to Fragments
      const result = await ifcConverter.convert(ifcData, options);

      // Set response headers for binary data
      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${options.name}.frag"`,
        "Content-Length": result.data.byteLength.toString(),
        "X-Fragments-Metadata": JSON.stringify(result.metadata),
      });

      // Send the binary data
      res.send(Buffer.from(result.data));
    };

    processConversion()
      .catch(next)
      .finally(() => {
        // Clean up the uploaded file
        if (filePath) {
          deleteTempFile(filePath).catch((err: Error) => {
            console.error("Failed to delete temp file:", err.message);
          });
        }
      });
  }
);

/**
 * GET /status
 * Check if the converter is ready
 */
router.get("/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    ready: true,
    service: "IFC to Fragments Converter",
    version: "1.0.0",
  });
});

export default router;
