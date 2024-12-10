# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies at root level
RUN npm install

# Install client dependencies
RUN cd client && npm install

# Copy the rest of the application
COPY . .

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
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Database environment variables
ENV DATABASE_URL="postgresql://neondb_owner:jY4cAGISlB0Q@ep-old-leaf-a5ccos42.us-east-2.aws.neon.tech/neondb?sslmode=require"
ENV PGDATABASE="neondb"
ENV PGHOST="ep-old-leaf-a5ccos42.us-east-2.aws.neon.tech"
ENV PGPORT="5432"
ENV PGUSER="neondb_owner"
ENV PGPASSWORD="jY4cAGISlB0Q"

EXPOSE 5000

CMD ["node", "dist/index.js"]
