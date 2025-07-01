# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/mcp-server-supabase/package.json ./packages/mcp-server-supabase/
COPY packages/mcp-utils/package.json ./packages/mcp-utils/

# Install ALL dependencies (including dev-dependencies for build)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the project (now tsup is available)
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install ONLY runtime dependencies (no build tools!)
RUN apk add --no-cache wget

# Create non-root user for security BEFORE copying files
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001 -G nodejs

# Copy package files for production dependencies
COPY package*.json ./
COPY packages/mcp-server-supabase/package.json ./packages/mcp-server-supabase/
COPY packages/mcp-utils/package.json ./packages/mcp-utils/

# Install ONLY production dependencies without build tools
# Use --ignore-scripts to skip any native compilation
RUN npm ci --only=production --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/packages/mcp-server-supabase/dist ./packages/mcp-server-supabase/dist
COPY --from=builder /app/packages/mcp-utils/dist ./packages/mcp-utils/dist

# Copy HTTP server and other necessary files
COPY mcp-http-server.js ./
COPY env.example ./

# Fix ownership for non-root user (do this efficiently)
RUN chown -R mcp:nodejs /app

# Expose ONLY the correct port
EXPOSE 3333

# Set default environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3333

# Switch to non-root user
USER mcp

# Health check endpoint - using wget as specified in docker-compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${MCP_PORT:-3333}/health || exit 1

# Default command - HTTP server for multi-transport support
CMD ["node", "mcp-http-server.js"] 