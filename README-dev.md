# Development Setup for Pages Functions

To run the project with Pages Functions locally, you need to run two processes:

## 1. Start Vite Dev Server (Terminal 1)
```bash
npm run dev
```
This runs on http://localhost:5173/

## 2. Start Wrangler Pages Dev (Terminal 2)
```bash
npm run dev:pages
```
This runs on http://localhost:8788/ and proxies to Vite for non-function requests.

## Access the Application
- Open http://localhost:8788/ (not 5173!)
- Functions are available at:
  - `/proxy` - CORS proxy for Factorio blueprint sources
  - `/imgur` - Imgur API integration

## Testing Functions
Run `./test-functions.sh` to test if functions are working correctly.

## Note
The Pages Functions only work when accessing via port 8788, not directly via Vite's port 5173.