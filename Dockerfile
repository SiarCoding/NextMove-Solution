# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source code first to ensure config files are available
COPY . .

# Install root dependencies
RUN npm install --include=dev

# Install client dependencies
RUN cd client && npm install --include=dev

# Build client and server
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.production ./.env

# Install production dependencies
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
