# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend application code
COPY backend/src ./src

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
