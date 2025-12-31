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

# Copy frontend files
WORKDIR /app
COPY frontend/ ./frontend/

# Set working directory to backend for runtime
WORKDIR /app/backend

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Start the application
CMD ["node", "dist/api/server.js"]