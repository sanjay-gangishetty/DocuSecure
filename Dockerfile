FROM ubuntu

# Update and install curl
RUN apt-get update 
RUN apt-get install -y curl

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

# Ensure that node_modules is ignored using .dockerignore
COPY . /app

# Set the working directory
WORKDIR /app

# Install dependencies
RUN npm install

# Copy the .env file to the container
COPY .env /app/.env

# Expose the necessary port (optional, if your app uses a port)
EXPOSE 3000

# Start the application
ENTRYPOINT [ "node", "app.js" ]
