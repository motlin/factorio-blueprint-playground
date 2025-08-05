#!/bin/bash

echo "Testing Cloudflare Pages Functions locally..."
echo "Make sure you're running both:"
echo "  1. npm run dev (in terminal 1)"
echo "  2. npm run dev:pages (in terminal 2)"
echo ""

# Test the proxy function
echo "1. Testing /proxy endpoint (should show CORS proxy info):"
curl -s http://localhost:8788/proxy | head -5
echo ""

# Test the imgur function
echo "2. Testing /imgur endpoint:"
curl -s http://localhost:8788/imgur
echo ""

# Test proxy with actual request
echo "3. Testing /proxy with factoriobin.com request:"
curl -s "http://localhost:8788/proxy?https://cdn.factoriobin.com/test" | head -5
echo ""

echo "Done testing."