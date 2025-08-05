#!/bin/bash

echo "Testing Functions directly (without Vite proxy)..."
echo "Run: npm run dev:functions"
echo ""

# Test all functions
echo "1. Testing /test endpoint:"
curl -s http://localhost:8788/test
echo -e "\n"

echo "2. Testing /proxy endpoint:"
curl -s http://localhost:8788/proxy | head -5
echo -e "\n"

echo "3. Testing /imgur endpoint:"
curl -s http://localhost:8788/imgur | head -5
echo -e "\n"

echo "Done testing."