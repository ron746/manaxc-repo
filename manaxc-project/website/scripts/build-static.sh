#!/bin/bash

# Build script for static export (excludes admin/API routes)
# This is used for Cloudflare Pages deployment

set -e

echo "🏗️  Preparing for static build..."

# Create temp directory outside project
TEMP_DIR="/tmp/manaxc-admin-backup-$$"
mkdir -p "$TEMP_DIR"

# Backup admin and API directories
if [ -d "app/admin" ]; then
  echo "📦 Backing up admin directory..."
  mv app/admin "$TEMP_DIR/admin"
fi

if [ -d "app/api" ]; then
  echo "📦 Backing up API directory..."
  mv app/api "$TEMP_DIR/api"
fi

echo "🔨 Building static site..."
npm run build

echo "♻️  Restoring admin and API directories..."
# Restore directories
if [ -d "$TEMP_DIR/admin" ]; then
  mv "$TEMP_DIR/admin" app/admin
fi

if [ -d "$TEMP_DIR/api" ]; then
  mv "$TEMP_DIR/api" app/api
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Static build complete!"
