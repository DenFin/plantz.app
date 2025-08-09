#!/bin/bash
set -euo pipefail

TAG=$(date +"%Y-%m")

echo "🔄 Pulling latest code..."
git pull

echo "🏗️ Building Docker image..."
docker compose build --build-arg BUILD_TAG=$TAG
docker tag plantz.app:latest plantz.app:$TAG

echo "🚀 Starting container..."
docker compose up -d

echo "✅ Deployment successful! (Tagged as $TAG and latest)"
