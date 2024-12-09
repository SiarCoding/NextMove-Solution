#!/bin/bash

# Build Client
cd client
npm run build

# Build Server
cd ../server
npm run build

# Create deployment directory
mkdir -p ../dist
cp -r ../client/dist/* ../dist/
cp -r ../server/dist/* ../dist/
cp ../server/package.json ../dist/
cp ../.env.production ../dist/.env

# Create start script
echo "node server.js" > ../dist/start.sh
chmod +x ../dist/start.sh
