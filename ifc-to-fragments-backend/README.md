# IFC to Fragments Backend

A Node.js backend service for converting IFC (Industry Foundation Classes) files to the Fragments format used by the That Open Engine. This service provides a REST API for uploading IFC files and receiving optimized Fragments binary data suitable for web-based BIM visualization.

## Features

- **IFC to Fragments Conversion**: Convert IFC files to the efficient Fragments format
- **REST API**: Simple HTTP API for file upload and conversion
- **Binary Output**: Returns optimized binary data with metadata headers
- **File Validation**: Validates IFC file format before processing
- **CORS Support**: Cross-origin resource sharing enabled for web applications
- **Automatic Cleanup**: Temporary uploaded files are automatically deleted after processing
- **Error Handling**: Comprehensive error handling with descriptive messages
- **Graceful Shutdown**: Proper cleanup on server termination
- **Health Monitoring**: Built-in health check and status endpoints

## Prerequisites

- **Node.js 18+** (LTS version recommended)
- **npm** (comes with Node.js)
- At least 2GB of available RAM for processing large IFC files

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ifc-to-fragments-backend
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

Example:
```bash
export PORT=8080
export NODE_ENV=production
```

## Quick Start

### Development Mode

Start the server with hot-reload:
```bash
npm run dev
```

The server will start and automatically restart on file changes.

### Production Mode

Build and start the production server:
```bash
npm run build
npm start
```

The server will be available at `http://localhost:3000` (or your configured PORT).

## API Endpoints

### GET /health

Health check endpoint to verify the server is running.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "uptime": 3600.5
}
```

### GET /api/status

Check the converter service status and readiness.

**Request:**
```bash
curl http://localhost:3000/api/status
```

**Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "IFC to Fragments Converter",
  "version": "1.0.0"
}
```

### POST /api/convert

Main conversion endpoint. Uploads an IFC file and returns the converted Fragments binary data.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field Name: `ifc` (required) - The IFC file to convert
- Optional Fields:
  - `name` (string) - Custom name for the output file
  - `coordinateToOrigin` (string) - Set to `"false"` to disable coordinate centering (default: `true`)

**Example using curl:**
```bash
curl -X POST \
  -F "ifc=@/path/to/your/model.ifc" \
  -F "name=my-building" \
  -F "coordinateToOrigin=true" \
  http://localhost:3000/api/convert \
  --output converted.frag
```

**Response:**
- Content-Type: `application/octet-stream`
- Body: Binary Fragments data
- Headers:
  - `Content-Disposition`: `attachment; filename="<name>.frag"`
  - `Content-Length`: Size of the binary data
  - `X-Fragments-Metadata`: JSON string containing conversion metadata

**Example Metadata Header:**
```json
{
  "name": "my-building",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "size": 1048576,
  "options": {
    "coordinateToOrigin": true,
    "name": "my-building"
  }
}
```

## Request/Response Formats

### Successful Conversion Response

- **Status Code**: 200 OK
- **Content-Type**: `application/octet-stream`
- **Body**: Binary Fragments data (Uint8Array)
- **Headers**: Include metadata about the conversion

### Error Response Format

All errors return JSON with the following structure:

```json
{
  "status": "fail" | "error",
  "message": "Descriptive error message"
}
```

In development mode, the response also includes a `stack` field with the stack trace.

## Error Handling

### Common Error Codes

| Status Code | Description |
|------------|-------------|
| 400 | Bad Request - Invalid file format, missing file, or validation error |
| 404 | Not Found - Endpoint does not exist |
| 413 | Payload Too Large - File exceeds 100MB limit |
| 500 | Internal Server Error - Conversion failed or server error |

### Error Examples

**No file uploaded:**
```json
{
  "status": "fail",
  "message": "No IFC file uploaded. Please upload a file with field name 'ifc'"
}
```

**Invalid file type:**
```json
{
  "status": "fail",
  "message": "Only IFC files are allowed"
}
```

**File too large:**
```json
{
  "status": "fail",
  "message": "File upload error: File too large"
}
```

## Testing

Run the test suite:

```bash
npm test
```

The tests include:
- Unit tests for the IFC converter service
- API integration tests
- Error handling tests

## Building for Production

1. Compile TypeScript to JavaScript:
```bash
npm run build
```

This creates optimized JavaScript files in the `dist/` directory.

2. Start the production server:
```bash
npm start
```

For production deployment, consider:
- Setting `NODE_ENV=production`
- Using a process manager like PM2
- Configuring reverse proxy (nginx, etc.)
- Setting up proper logging and monitoring

## Project Structure

```
ifc-to-fragments-backend/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── app.ts                   # Express app configuration
│   ├── routes/
│   │   └── convert.ts           # API route handlers
│   ├── services/
│   │   └── ifc-converter.ts     # IFC conversion service
│   ├── middleware/
│   │   └── error-handler.ts     # Error handling middleware
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── utils/
│       └── file-utils.ts        # File utility functions
├── tests/
│   ├── api.test.ts              # API integration tests
│   ├── ifc-converter.test.ts    # Unit tests
│   ├── setup.ts                 # Test setup
│   └── fixtures/                # Test fixtures
├── uploads/                     # Temporary upload directory
├── dist/                        # Compiled JavaScript (after build)
├── package.json                 # Project dependencies
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest test configuration
└── .eslintrc.json              # ESLint configuration
```

## Dependencies

### Production Dependencies

- **@thatopen/fragments** (^3.2.0): Core library for Fragments format handling and conversion
- **web-ifc** (^0.0.72): WebAssembly-based IFC file parser
- **express** (^4.18.2): Fast, minimalist web framework for Node.js
- **multer** (^1.4.5-lts.1): Middleware for handling multipart/form-data (file uploads)
- **cors** (^2.8.5): Cross-Origin Resource Sharing middleware
- **pako** (^2.1.0): High-speed compression library (used internally by fragments)

### Development Dependencies

- **typescript**: TypeScript compiler
- **tsx**: TypeScript execution and watch mode
- **jest**: Testing framework
- **eslint**: Code linting
- **supertest**: HTTP assertions for testing

## Performance Considerations

- **File Size Limit**: Maximum 100MB per file
- **Memory Usage**: Large IFC files may require significant memory during conversion
- **Conversion Time**: Varies based on IFC file complexity (typically 1-30 seconds)
- **Temporary Storage**: Uploaded files are stored temporarily in `uploads/` directory

## Security Notes

- Files are validated to ensure they have `.ifc` extension
- Temporary files are automatically cleaned up after processing
- CORS is enabled by default; configure for production environments
- Consider adding rate limiting for production use
- Consider adding authentication for sensitive deployments

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and feature requests, please open an issue in the repository.
