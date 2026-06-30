# Use an official, lightweight Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the server code
COPY server.js ./

# Expose the port Cloud Run expects
EXPOSE 8080

# Command to run the proxy
CMD ["node", "server.js"]