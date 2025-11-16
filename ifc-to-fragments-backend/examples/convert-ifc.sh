#!/bin/bash

#
# IFC to Fragments Converter - Bash Script Example
#
# This script demonstrates how to convert IFC files to Fragments format
# using curl to call the conversion API.
#
# Usage:
#   ./convert-ifc.sh <input.ifc> [output.frag]
#
# Examples:
#   ./convert-ifc.sh model.ifc
#   ./convert-ifc.sh building.ifc converted.frag
#   API_URL=http://192.168.1.100:3000 ./convert-ifc.sh model.ifc
#

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
CONVERT_ENDPOINT="${API_URL}/api/convert"
HEALTH_ENDPOINT="${API_URL}/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    echo "Usage: $0 <input.ifc> [output.frag] [options]"
    echo ""
    echo "Arguments:"
    echo "  input.ifc          Path to the IFC file to convert (required)"
    echo "  output.frag        Path for the output Fragments file (optional)"
    echo ""
    echo "Options:"
    echo "  -n, --name NAME    Custom name for the model"
    echo "  --no-coord-origin  Disable coordinate centering"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  API_URL            Base URL of the API (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0 model.ifc"
    echo "  $0 model.ifc output.frag"
    echo "  $0 model.ifc -n \"My Building\""
    echo "  API_URL=http://server:3000 $0 model.ifc"
    exit 1
}

# Function to check server health
check_health() {
    print_info "Checking server health at ${HEALTH_ENDPOINT}..."

    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi

    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEALTH_ENDPOINT}" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
    BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Server is healthy"
        if command -v jq &> /dev/null; then
            echo "$BODY" | jq -r '"  Status: \(.status)\n  Uptime: \(.uptime | floor) seconds"'
        fi
    else
        print_error "Server health check failed (HTTP $HTTP_CODE)"
        exit 1
    fi
}

# Function to convert IFC file
convert_ifc() {
    local INPUT_FILE="$1"
    local OUTPUT_FILE="$2"
    local MODEL_NAME="$3"
    local COORD_TO_ORIGIN="$4"

    # Build curl command
    local CURL_ARGS=("-X" "POST" "-s" "-w" "\n%{http_code}")

    # Add file
    CURL_ARGS+=("-F" "ifc=@${INPUT_FILE}")

    # Add optional parameters
    if [ -n "$MODEL_NAME" ]; then
        CURL_ARGS+=("-F" "name=${MODEL_NAME}")
        print_info "Using custom model name: ${MODEL_NAME}"
    fi

    if [ "$COORD_TO_ORIGIN" = "false" ]; then
        CURL_ARGS+=("-F" "coordinateToOrigin=false")
        print_info "Coordinate to origin: disabled"
    fi

    # Save headers to extract metadata
    local HEADER_FILE=$(mktemp)
    CURL_ARGS+=("-D" "$HEADER_FILE")

    print_info "Sending conversion request to ${CONVERT_ENDPOINT}..."
    print_info "Input file: ${INPUT_FILE}"
    print_info "Output file: ${OUTPUT_FILE}"

    # Execute conversion
    local START_TIME=$(date +%s.%N)

    local RESPONSE
    RESPONSE=$(curl "${CURL_ARGS[@]}" "${CONVERT_ENDPOINT}" --output "${OUTPUT_FILE}" 2>&1)

    local END_TIME=$(date +%s.%N)
    local ELAPSED=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "N/A")

    local HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

    # Check for success
    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "Conversion completed successfully!"

        # Display timing
        if [ "$ELAPSED" != "N/A" ]; then
            print_info "Time elapsed: ${ELAPSED} seconds"
        fi

        # Display file info
        if [ -f "$OUTPUT_FILE" ]; then
            local FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
            print_success "Output saved to: ${OUTPUT_FILE} (${FILE_SIZE})"
        fi

        # Display metadata from headers
        if [ -f "$HEADER_FILE" ]; then
            local METADATA=$(grep -i "X-Fragments-Metadata:" "$HEADER_FILE" 2>/dev/null | cut -d' ' -f2-)
            if [ -n "$METADATA" ]; then
                echo ""
                print_info "Conversion Metadata:"
                if command -v jq &> /dev/null; then
                    echo "$METADATA" | jq '.'
                else
                    echo "  $METADATA"
                fi
            fi
        fi
    else
        print_error "Conversion failed with HTTP status: ${HTTP_CODE}"

        # Try to read error message from output file
        if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
            local ERROR_MSG
            if command -v jq &> /dev/null; then
                ERROR_MSG=$(jq -r '.message // "Unknown error"' "$OUTPUT_FILE" 2>/dev/null || cat "$OUTPUT_FILE")
            else
                ERROR_MSG=$(cat "$OUTPUT_FILE")
            fi
            print_error "Server response: ${ERROR_MSG}"
            rm -f "$OUTPUT_FILE"
        fi

        rm -f "$HEADER_FILE"
        exit 1
    fi

    # Cleanup
    rm -f "$HEADER_FILE"
}

# Main script
main() {
    echo "=== IFC to Fragments Converter ==="
    echo ""

    # Parse arguments
    local INPUT_FILE=""
    local OUTPUT_FILE=""
    local MODEL_NAME=""
    local COORD_TO_ORIGIN="true"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -n|--name)
                MODEL_NAME="$2"
                shift 2
                ;;
            --no-coord-origin)
                COORD_TO_ORIGIN="false"
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                usage
                ;;
            *)
                if [ -z "$INPUT_FILE" ]; then
                    INPUT_FILE="$1"
                elif [ -z "$OUTPUT_FILE" ]; then
                    OUTPUT_FILE="$1"
                else
                    print_error "Too many arguments"
                    usage
                fi
                shift
                ;;
        esac
    done

    # Validate input file
    if [ -z "$INPUT_FILE" ]; then
        print_error "Input file is required"
        usage
    fi

    if [ ! -f "$INPUT_FILE" ]; then
        print_error "Input file not found: ${INPUT_FILE}"
        exit 1
    fi

    if [[ ! "$INPUT_FILE" =~ \.ifc$ ]]; then
        print_warning "Input file does not have .ifc extension"
    fi

    # Set default output file if not specified
    if [ -z "$OUTPUT_FILE" ]; then
        OUTPUT_FILE="${INPUT_FILE%.ifc}.frag"
        print_info "Using default output file: ${OUTPUT_FILE}"
    fi

    # Display input file size
    local INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
    print_info "Input file size: ${INPUT_SIZE}"

    echo ""

    # Check server health
    check_health

    echo ""

    # Perform conversion
    convert_ifc "$INPUT_FILE" "$OUTPUT_FILE" "$MODEL_NAME" "$COORD_TO_ORIGIN"

    echo ""
    print_success "=== Conversion Complete ==="
}

# Run main function
main "$@"
