# CLAUDE.md - AI Assistant Guidelines for nibras Repository

This document provides essential context and conventions for AI assistants working with the nibras codebase.

## Project Overview

**nibras** is a Node.js/TypeScript backend service that converts IFC (Industry Foundation Classes) files to the Fragments format used by That Open Engine. This service provides a REST API for BIM (Building Information Modeling) file conversion, enabling web-based 3D visualization of architectural and construction models.

### Core Purpose
- Convert IFC files (standard format for BIM data exchange) to optimized Fragments binary format
- Provide HTTP REST API for file upload and conversion
- Return optimized binary data suitable for web-based rendering

## Repository Structure

```
nibras/
└── ifc-to-fragments-backend/          # Main application directory
    ├── src/                            # Source code (TypeScript)
    │   ├── index.ts                    # Application entry point
    │   ├── app.ts                      # Express app configuration
    │   ├── routes/                     # API route handlers
    │   │   └── convert.ts              # POST /api/convert, GET /api/status
    │   ├── services/                   # Business logic
    │   │   └── ifc-converter.ts        # Core conversion service (singleton)
    │   ├── middleware/                 # Express middleware
    │   │   └── error-handler.ts        # Global error handling, ApiError class
    │   ├── types/                      # TypeScript type definitions
    │   │   └── index.ts                # ConversionOptions, ConversionResult
    │   └── utils/                      # Utility functions
    │       └── file-utils.ts           # File I/O operations
    ├── tests/                          # Test suite
    │   ├── api.test.ts                 # API integration tests
    │   ├── ifc-converter.test.ts       # Unit tests for converter service
    │   ├── setup.ts                    # Test setup utilities
    │   └── fixtures/                   # Test fixtures (sample.ifc)
    ├── examples/                       # Usage examples
    │   ├── convert-ifc.js              # Node.js client example
    │   └── convert-ifc.sh              # Shell script example
    ├── dist/                           # Compiled JavaScript (after build)
    ├── uploads/                        # Temporary file storage (gitignored)
    ├── package.json                    # Dependencies and scripts
    ├── tsconfig.json                   # TypeScript configuration
    ├── tsconfig.test.json              # Test-specific TypeScript config
    ├── jest.config.js                  # Jest test configuration
    ├── .eslintrc.json                  # ESLint configuration
    ├── README.md                       # User documentation
    └── API.md                          # API documentation
```

## Technology Stack

### Runtime & Language
- **Node.js 18+** (LTS recommended)
- **TypeScript 5.4+** with strict mode enabled
- **ES Modules** (type: "module" in package.json)
- **Target**: ES2022

### Key Dependencies

**Production:**
- `@thatopen/fragments` (^3.2.0) - Core library for Fragments format conversion
- `web-ifc` (^0.0.72) - WebAssembly-based IFC parser
- `express` (^4.18.2) - Web framework
- `multer` (^1.4.5-lts.1) - File upload middleware (multipart/form-data)
- `cors` (^2.8.5) - CORS middleware
- `pako` (^2.1.0) - Compression (used internally by fragments)

**Development:**
- `tsx` - TypeScript execution and hot-reload
- `jest` + `ts-jest` - Testing framework (ESM preset)
- `supertest` - HTTP assertion testing
- `eslint` + `@typescript-eslint/*` - Code linting with type-checking

## Development Workflows

### Common Commands

```bash
# Navigate to project directory first
cd ifc-to-fragments-backend

# Development (hot-reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests (with ESM support)
npm test

# Lint code
npm run lint
```

### Development Server
- Default port: 3000 (configurable via PORT env variable)
- Health check: `GET /health`
- API status: `GET /api/status`
- Main conversion endpoint: `POST /api/convert`

### Testing

Tests use Jest with ES Modules support. The `@thatopen/fragments` module is mocked in tests to avoid WebAssembly dependencies.

**Test patterns:**
```bash
# Run all tests
npm test

# Tests are located in tests/ directory
# - api.test.ts: Integration tests
# - ifc-converter.test.ts: Unit tests
```

**Important testing notes:**
- Uses `jest.unstable_mockModule` for ESM module mocking
- Tests require `NODE_OPTIONS=--experimental-vm-modules`
- Mocks return `Uint8Array([1, 2, 3, 4, 5])` as sample binary data

## Code Conventions

### TypeScript Standards
- **Strict mode** enabled (strict: true in tsconfig)
- **Explicit return types** (ESLint warns on missing)
- **No explicit any** (ESLint warns)
- **No floating promises** (ESLint errors)
- **Unused variables** must be prefixed with `_` (e.g., `_req`, `_file`)

### File Organization
- One primary export per file
- Services export both class and singleton instance
- Types are centralized in `src/types/index.ts`
- File extensions in imports: Always use `.js` (for ESM compatibility)

### Import Pattern
```typescript
// Always use .js extension in imports (required for ESM)
import app from "./app.js";
import { ifcConverter } from "./services/ifc-converter.js";
```

### Error Handling
- Use `ApiError` class from `middleware/error-handler.ts`
- Status codes: 400 for client errors, 500 for server errors
- Error responses follow JSend-like format: `{ status: "fail"|"error", message: string }`
- Stack traces included only in non-production environments

### Naming Conventions
- **Files**: kebab-case (e.g., `ifc-converter.ts`, `error-handler.ts`)
- **Classes**: PascalCase (e.g., `IfcToFragmentsConverter`, `ApiError`)
- **Functions**: camelCase (e.g., `readFileAsUint8Array`, `deleteTempFile`)
- **Interfaces**: PascalCase (e.g., `ConversionOptions`, `ConversionResult`)
- **Constants**: SCREAMING_SNAKE_CASE for config (e.g., `COORDINATE_TO_ORIGIN`)

## API Design Patterns

### Request Handling
- File uploads use `multipart/form-data`
- Field name for IFC file: `ifc`
- Options passed as form fields (strings)
- Boolean options: compare against string `"false"`

### Response Format
- Success: Binary data with `application/octet-stream`
- Metadata in `X-Fragments-Metadata` header (JSON string)
- Errors: JSON with status and message

### File Management
- Uploads stored temporarily in `uploads/` directory
- Automatic cleanup after processing (in finally block)
- 100MB file size limit
- Only `.ifc` files accepted

## Architecture Patterns

### Singleton Service
The `IfcToFragmentsConverter` is exported as a singleton instance:
```typescript
export const ifcConverter = new IfcToFragmentsConverter();
```

### Initialization Lifecycle
1. Service initialized at startup (`ifcConverter.initialize()`)
2. WebAssembly path set to `./node_modules/web-ifc/`
3. Graceful shutdown cleans up resources

### Async Error Handling
Routes use async/await with Promise-based error propagation:
```typescript
processConversion()
  .catch(next)  // Pass errors to Express error middleware
  .finally(() => {
    // Cleanup code
  });
```

## Security Considerations

- File type validation (extension and MIME type)
- Automatic temporary file cleanup
- No authentication (consider adding for production)
- CORS enabled by default (restrict in production)
- No rate limiting (consider adding for production)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

## Common Tasks for AI Assistants

### Adding a New Route
1. Create route handler in `src/routes/`
2. Use Express Router pattern
3. Add type annotations for Request, Response, NextFunction
4. Handle errors with try/catch and next()
5. Mount in `src/app.ts`

### Adding a New Service
1. Create service class in `src/services/`
2. Export singleton instance if needed
3. Add initialization logic if resources need setup
4. Add cleanup method for graceful shutdown
5. Define types in `src/types/index.ts`

### Adding Tests
1. Mock external dependencies using `jest.unstable_mockModule`
2. Import after mocking (dynamic imports)
3. Use setup/teardown for test fixtures
4. Follow existing test patterns in `tests/`

### Debugging
- Server logs to console
- Error stack traces in development mode
- Use `npm run dev` for hot-reload during development
- Check `/health` endpoint for server status

## Performance Notes

- Large IFC files may require significant memory (recommend 2GB+ RAM)
- Conversion time varies: 1-30 seconds depending on complexity
- Binary output is gzip-compressed by fragments library
- File uploads are disk-backed (not memory-buffered)

## Build and Deployment

### Build Process
```bash
npm run build  # Compiles TypeScript to dist/
npm start      # Runs compiled JavaScript
```

### Production Checklist
- Set `NODE_ENV=production`
- Configure appropriate `PORT`
- Set up process manager (PM2 recommended)
- Configure reverse proxy (nginx)
- Add authentication if exposing publicly
- Implement rate limiting
- Set up logging and monitoring

## Git Workflow

- Feature branches: `git checkout -b feature/amazing-feature`
- Conventional commits encouraged
- Clean working directory before branching
- Test before committing: `npm test`
- Lint before committing: `npm run lint`

## Important Files to Know

- **Entry point**: `ifc-to-fragments-backend/src/index.ts:7` - startServer function
- **Express app**: `ifc-to-fragments-backend/src/app.ts:7` - app configuration
- **Core converter**: `ifc-to-fragments-backend/src/services/ifc-converter.ts:5` - IfcToFragmentsConverter class
- **Main route**: `ifc-to-fragments-backend/src/routes/convert.ts:50` - POST /convert handler
- **Error handling**: `ifc-to-fragments-backend/src/middleware/error-handler.ts:31` - errorHandler middleware
- **Types**: `ifc-to-fragments-backend/src/types/index.ts:3` - ConversionOptions interface

## Quick Reference

**Start development server:**
```bash
cd ifc-to-fragments-backend && npm run dev
```

**Test API manually:**
```bash
curl -X POST -F "ifc=@model.ifc" http://localhost:3000/api/convert --output result.frag
```

**Check service health:**
```bash
curl http://localhost:3000/health
```

**Run tests:**
```bash
cd ifc-to-fragments-backend && npm test
```
