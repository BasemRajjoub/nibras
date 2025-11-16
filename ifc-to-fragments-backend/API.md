# IFC to Fragments API Documentation

This document provides detailed API documentation for the IFC to Fragments conversion service.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, no authentication is required. For production deployments, consider adding authentication middleware.

## Content Types

- **Request**: `multipart/form-data` (for file uploads)
- **Response**: `application/octet-stream` (binary data) or `application/json` (errors and status)

---

## Endpoints

### Health Check

Check if the server is running and healthy.

**Endpoint:** `GET /health`

**Request Headers:**
```
Accept: application/json
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| status | string | Server health status ("healthy") |
| timestamp | string | ISO 8601 timestamp |
| uptime | number | Server uptime in seconds |

**Example Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "uptime": 7245.123
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

### Service Status

Check the converter service status and version.

**Endpoint:** `GET /api/status`

**Request Headers:**
```
Accept: application/json
```

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| status | string | Service status ("ok") |
| ready | boolean | Whether the converter is initialized |
| service | string | Service name |
| version | string | Service version |

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/status
```

**Example Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "IFC to Fragments Converter",
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` - Status retrieved successfully

---

### Convert IFC to Fragments

Convert an IFC file to Fragments binary format.

**Endpoint:** `POST /api/convert`

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ifc | File | Yes | The IFC file to convert |
| name | string | No | Custom name for the output (default: original filename without .ifc) |
| coordinateToOrigin | string | No | "true" or "false" - Center model at origin (default: "true") |

**Response Headers:**

| Header | Description |
|--------|-------------|
| Content-Type | `application/octet-stream` |
| Content-Disposition | `attachment; filename="<name>.frag"` |
| Content-Length | Size of the binary data in bytes |
| X-Fragments-Metadata | JSON string with conversion metadata |

**X-Fragments-Metadata Schema:**
```json
{
  "name": "string",
  "timestamp": "ISO 8601 string",
  "size": "number (bytes)",
  "options": {
    "coordinateToOrigin": "boolean",
    "name": "string"
  }
}
```

**Response Body:**
Binary Fragments data (Uint8Array)

**Example curl Request:**
```bash
# Basic conversion
curl -X POST \
  -F "ifc=@model.ifc" \
  http://localhost:3000/api/convert \
  --output model.frag

# With custom name
curl -X POST \
  -F "ifc=@building.ifc" \
  -F "name=my-custom-name" \
  http://localhost:3000/api/convert \
  --output my-custom-name.frag

# Disable coordinate to origin
curl -X POST \
  -F "ifc=@model.ifc" \
  -F "coordinateToOrigin=false" \
  http://localhost:3000/api/convert \
  --output model.frag

# Save with metadata extraction
curl -X POST \
  -F "ifc=@model.ifc" \
  http://localhost:3000/api/convert \
  --output model.frag \
  -D headers.txt

# View metadata from headers
grep "X-Fragments-Metadata" headers.txt
```

**Example JavaScript/Node.js (Fetch API):**
```javascript
import fs from 'fs';
import path from 'path';

async function convertIFC(ifcFilePath, options = {}) {
  const formData = new FormData();

  // Read the IFC file
  const fileBuffer = fs.readFileSync(ifcFilePath);
  const blob = new Blob([fileBuffer], { type: 'application/x-step' });
  const fileName = path.basename(ifcFilePath);

  formData.append('ifc', blob, fileName);

  // Add optional parameters
  if (options.name) {
    formData.append('name', options.name);
  }

  if (options.coordinateToOrigin !== undefined) {
    formData.append('coordinateToOrigin', String(options.coordinateToOrigin));
  }

  const response = await fetch('http://localhost:3000/api/convert', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Conversion failed: ${error.message}`);
  }

  // Get metadata from headers
  const metadataHeader = response.headers.get('X-Fragments-Metadata');
  const metadata = metadataHeader ? JSON.parse(metadataHeader) : null;

  // Get binary data
  const arrayBuffer = await response.arrayBuffer();
  const fragmentsData = new Uint8Array(arrayBuffer);

  return {
    data: fragmentsData,
    metadata: metadata,
  };
}

// Usage
const result = await convertIFC('./model.ifc', { name: 'my-building' });
console.log('Metadata:', result.metadata);

// Save to file
fs.writeFileSync('output.frag', Buffer.from(result.data));
```

**Example JavaScript/Node.js (node-fetch with FormData):**
```javascript
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function convertIFC(ifcFilePath) {
  const form = new FormData();

  // Append file stream
  form.append('ifc', fs.createReadStream(ifcFilePath));
  form.append('name', 'converted-model');

  const response = await fetch('http://localhost:3000/api/convert', {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const buffer = await response.buffer();
  fs.writeFileSync('output.frag', buffer);

  console.log('Conversion successful!');
  console.log('Metadata:', response.headers.get('X-Fragments-Metadata'));
}

convertIFC('./model.ifc').catch(console.error);
```

**Example Python (requests):**
```python
import requests

def convert_ifc(ifc_path, output_path, name=None):
    url = 'http://localhost:3000/api/convert'

    with open(ifc_path, 'rb') as f:
        files = {'ifc': f}
        data = {}

        if name:
            data['name'] = name

        response = requests.post(url, files=files, data=data)

    if response.status_code != 200:
        error = response.json()
        raise Exception(f"Conversion failed: {error['message']}")

    # Save binary data
    with open(output_path, 'wb') as f:
        f.write(response.content)

    # Get metadata
    metadata = response.headers.get('X-Fragments-Metadata')
    print(f"Metadata: {metadata}")

convert_ifc('model.ifc', 'output.frag', name='my-model')
```

**Status Codes:**
- `200 OK` - Conversion successful
- `400 Bad Request` - Invalid request (see error codes below)
- `413 Payload Too Large` - File exceeds 100MB limit
- `500 Internal Server Error` - Conversion failed

---

## Error Codes and Messages

### Client Errors (4xx)

| Error Code | Message | Description |
|------------|---------|-------------|
| 400 | No IFC file uploaded. Please upload a file with field name 'ifc' | No file was provided in the request |
| 400 | Only IFC files are allowed | File does not have .ifc extension or correct MIME type |
| 400 | File upload error: File too large | File exceeds 100MB limit |
| 400 | Invalid JSON in request body | Malformed JSON in request |
| 404 | Route {path} not found | Requested endpoint does not exist |

### Server Errors (5xx)

| Error Code | Message | Description |
|------------|---------|-------------|
| 500 | Failed to convert IFC to Fragments: {details} | Conversion process failed |
| 500 | IFC importer not initialized. Call initialize() first. | Server not properly initialized |
| 500 | Internal server error | Unexpected server error |

### Error Response Schema

```json
{
  "status": "fail" | "error",
  "message": "Error description",
  "stack": "Stack trace (development only)"
}
```

- `status: "fail"` - Client error (4xx)
- `status: "error"` - Server error (5xx)

---

## Headers Explanation

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | Must be `multipart/form-data` for file uploads |
| Accept | No | Recommended: `application/octet-stream` |

### Response Headers

| Header | Description |
|--------|-------------|
| Content-Type | `application/octet-stream` for binary data, `application/json` for errors |
| Content-Disposition | Suggested filename for the converted file |
| Content-Length | Size of the response body in bytes |
| X-Fragments-Metadata | JSON metadata about the conversion |
| Access-Control-Allow-Origin | CORS header (defaults to `*`) |

### X-Fragments-Metadata Details

This custom header contains JSON-encoded metadata about the conversion:

```json
{
  "name": "model-name",           // Name of the converted model
  "timestamp": "2025-01-15T10:30:00.000Z", // When conversion completed
  "size": 2097152,                // Size of fragments data in bytes
  "options": {
    "coordinateToOrigin": true,   // Whether coordinates were centered
    "name": "model-name"          // Name option used
  }
}
```

---

## Rate Limiting

No rate limiting is implemented by default. For production use, consider adding rate limiting middleware to prevent abuse.

Recommended limits:
- 10 requests per minute per IP
- Maximum 5 concurrent conversions

---

## File Size Limits

- **Maximum file size**: 100MB
- Larger files will receive a `413 Payload Too Large` response

For larger files, consider:
- Splitting the IFC model
- Increasing the limit (modify `multer` configuration)
- Using streaming uploads

---

## WebSocket Support

WebSocket support is not currently implemented. For real-time progress updates, consider implementing:

```javascript
// Future WebSocket API (not implemented)
const ws = new WebSocket('ws://localhost:3000/api/convert/ws');

ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.percentage}%`);
};
```

---

## API Versioning

Current version: **1.0.0**

The API does not currently use versioned endpoints. Future versions may introduce:
- `/v1/api/convert`
- `/v2/api/convert`

---

## CORS Configuration

Cross-Origin Resource Sharing is enabled by default for all origins. For production:

```javascript
// Restrict to specific origins
app.use(cors({
  origin: ['https://yourdomain.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
```

---

## Troubleshooting

### Common Issues

1. **"Only IFC files are allowed"**
   - Ensure file has `.ifc` extension
   - Check that field name is `ifc` (case-sensitive)

2. **"No IFC file uploaded"**
   - Verify Content-Type is `multipart/form-data`
   - Check form field name is exactly `ifc`

3. **Connection refused**
   - Ensure server is running
   - Check port configuration
   - Verify firewall settings

4. **Timeout errors**
   - Large files may take time to process
   - Increase client timeout settings
   - Consider file size optimization

5. **Memory errors**
   - Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Process smaller files or optimize IFC content
