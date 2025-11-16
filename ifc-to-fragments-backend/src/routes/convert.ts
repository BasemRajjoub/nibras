// Conversion API routes
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { ifcConverter } from "../services/ifc-converter.js";
import { readFileAsUint8Array, deleteTempFile, ensureDirectoryExists } from "../utils/file-utils.js";
import { ApiError } from "../middleware/error-handler.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "uploads/";
    try {
      await ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
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
  async (req: Request, res: Response, next: NextFunction) => {
    let filePath: string | null = null;

    try {
      if (!req.file) {
        throw new ApiError("No IFC file uploaded. Please upload a file with field name 'ifc'", 400);
      }

      filePath = req.file.path;

      // Read the uploaded IFC file as Uint8Array
      const ifcData = await readFileAsUint8Array(filePath);

      // Extract options from request body
      const options = {
        name: req.body.name || req.file.originalname.replace(".ifc", ""),
        coordinateToOrigin: req.body.coordinateToOrigin !== "false",
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
    } catch (error) {
      next(error);
    } finally {
      // Clean up the uploaded file
      if (filePath) {
        await deleteTempFile(filePath);
      }
    }
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
