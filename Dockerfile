# Use official Node.js LTS image as base
FROM node:20-bullseye

# Install system dependencies (FFmpeg, Python, etc.)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Cache bust - increment to force rebuild: v5
ARG CACHEBUST=5
# Force cache invalidation by using the ARG
RUN echo "Cache bust: $CACHEBUST"

# List what's in build context to debug
RUN echo "Listing /app contents before any COPY"

# Copy shared code - use ADD instead of COPY to avoid caching issues
ADD shared/ ./shared/

# Verify shared was copied
RUN echo "=== After ADD shared ===" && ls -la /app/shared/ && wc -l /app/shared/categories.ts

# Copy package files
COPY backend/package*.json ./backend/

# Install Node.js dependencies (including dev deps for build)
WORKDIR /app/backend
RUN npm ci

# Copy Python requirements
COPY backend/requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Build frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ ./

# Copy shared folder DIRECTLY into frontend's expected location
COPY shared/ ../shared/

# Debug: verify shared folder exists
RUN echo "=== Checking shared folder ===" && ls -la /app/shared/ && cat /app/shared/categories.ts | head -5

# Build frontend (skip tsc type check, Vite handles bundling with its own alias resolution)
RUN npx vite build

# Set working directory to backend for runtime
WORKDIR /app/backend

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Start the application
CMD ["node", "dist/backend/src/index.js"]
