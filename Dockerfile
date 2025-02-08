# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Install dependencies separately to leverage caching
COPY package.json yarn.lock ./ 


# Install dependencies
RUN yarn  --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to start the app
CMD ["node", "src/server.js"]
