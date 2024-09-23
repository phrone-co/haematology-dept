# Use an official Node.js image as the base
FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

RUN apt-get install libstdc++6
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python;

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install pm2 -g
# RUN npm install @tensorflow/tfjs @tensorflow/tfjs-node face-api.js

# Copy the rest of the application code
COPY . .

# Install OpenSSL for generating SSL certificates
RUN apt-get update && apt-get install -y openssl

# Expose the HTTPS port (443)
EXPOSE 5000

# Run the app
CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]

