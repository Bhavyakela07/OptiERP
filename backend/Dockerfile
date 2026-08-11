# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and database schema
COPY . .

# Build TypeScript output
RUN npm run build

# Expose backend REST API port
EXPOSE 4000

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Run auto-seeding and start production backend server
CMD ["sh", "-c", "npm run seed && node dist/server.js"]
