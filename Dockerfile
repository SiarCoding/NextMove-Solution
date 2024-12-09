# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy all source code first
COPY . .

# Install root dependencies
RUN npm install

# Install client dependencies and build client
RUN cd client && npm install && npm run build

# Build server
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
