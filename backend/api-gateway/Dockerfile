
FROM node:18-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk --no-cache add curl

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application code
COPY . .

# Set environment variables
ENV PORT=7500

# Expose the port
EXPOSE 7500

# Start the application
CMD ["node", "server.js"]
