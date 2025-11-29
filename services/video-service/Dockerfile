FROM node:18-alpine

WORKDIR /app

# Copy proto files from root
COPY proto ./proto

# Copy package files
COPY services/video-service/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY services/video-service/ .

# Create uploads directory
RUN mkdir -p /app/uploads/videos

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
