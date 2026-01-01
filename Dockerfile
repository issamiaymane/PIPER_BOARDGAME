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

# Copy shared code FIRST (needed for postinstall symlink)
COPY shared/ ./shared/

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

# Fix @shared symlink to point to compiled JS (not TS source)
# Must be AFTER npm prune to avoid being reset
RUN rm -rf node_modules/@shared && ln -s ../dist/shared node_modules/@shared

# Copy frontend files
WORKDIR /app
COPY frontend/ ./frontend/

# Set working directory to backend for runtime
WORKDIR /app/backend

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Start the application
CMD ["node", "dist/backend/src/index.js"]
