#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r backend/requirements.txt

# Build the frontend
cd frontend
npm install
npm run build
cd ..
