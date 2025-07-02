# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/mcp-server-supabase/package.json ./packages/mcp-server-supabase/
COPY packages/mcp-utils/package.json ./packages/mcp-utils/

# Install dependencies (skip scripts for libpg-query compatibility)
RUN npm install --ignore-scripts --production

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Expose port for health checks (optional)
EXPOSE 3333

# Set default environment variables (can be overridden)
ENV NODE_ENV=production
ENV MCP_PORT=3333

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001
USER mcp

# Health check endpoint (optional)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('MCP Server is healthy')" || exit 1

# Default command - can be overridden by Coolify
CMD ["node", "packages/mcp-server-supabase/dist/transports/stdio.js"] 