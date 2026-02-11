# Use a base image with Node.js
FROM node:18-slim

# Install system dependencies: Python3 (for yt-dlp) and FFmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install yt-dlp --break-system-packages

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
# Copy scripts because postinstall needs them
COPY scripts/ ./scripts/
RUN npm install

# Copy the rest of the application code
COPY . .

# Create downloads directory
RUN mkdir -p downloads

# Set environment variables (Optional defaults, usually overridden by cloud provider)
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "start"]
