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

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/mcp-server-supabase/package.json ./packages/mcp-server-supabase/
COPY packages/mcp-utils/package.json ./packages/mcp-utils/

# Install only production dependencies
RUN npm install --ignore-scripts --production

# Copy built files from builder stage
COPY --from=builder /app/packages/mcp-server-supabase/dist ./packages/mcp-server-supabase/dist
COPY --from=builder /app/packages/mcp-utils/dist ./packages/mcp-utils/dist

# Copy HTTP server and other necessary files
COPY mcp-http-server.js ./
COPY env.example ./

# Expose port for health checks and HTTP server
EXPOSE 3000 3333

# Set default environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3333

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001
USER mcp

# Health check endpoint - simpler version
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.MCP_PORT || 3333) + '/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 1

# Default command - HTTP server for multi-transport support
CMD ["node", "mcp-http-server.js"] 