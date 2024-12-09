# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci
RUN cd client && npm ci

# Copy source code
COPY . .

# Build server
RUN npm run build:server

# Build client separately
WORKDIR /app/client
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./package.json

# Install production dependencies
RUN npm ci --only=production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
