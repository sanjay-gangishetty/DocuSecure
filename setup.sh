#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Set the project name for Docker Compose
export COMPOSE_PROJECT_NAME=docu-secure

# Build and start the Docker containers
echo "Building and starting the Docker containers..."
docker-compose up --build

# Optional: Uncomment the following line to run in detached mode
# docker-compose up -d --build

echo "Setup completed. Access your application at http://localhost:8000"
