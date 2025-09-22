FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY landing/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY landing/ ./

# Build the application
RUN npm run build

# Use a simple HTTP server
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", ".next", "-l", "3000"]
