FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY services/streaming-service/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY services/streaming-service/ .

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
