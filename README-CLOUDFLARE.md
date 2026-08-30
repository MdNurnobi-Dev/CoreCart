# Cloudflare Pages & Functions Deployment Guide

This project has been upgraded to support **Cloudflare Pages & Functions** while maintaining 100% compatibility with CPanel, VPS, and Docker environments.

## What was added:
1. **`wrangler.toml`**: Cloudflare Pages configuration file.
2. **`.github/workflows/cloudflare.yml`**: Auto-deployment workflow for GitHub Actions.
3. **`functions/api/[[path]].ts`**: Cloudflare Pages Function that acts as a serverless API handler and reverse proxy.
4. **`public/_redirects`**: Ensures React Single Page Application (SPA) routing works perfectly on Cloudflare.
5. **`serverless-http`**: Installed to adapt the Express backend for serverless environments.

## How it works:
Your existing `server.ts` Express application remains unchanged for VPS/CPanel deployments. When deployed to Cloudflare Pages, the `functions/api/[[path]].ts` function intercepts all `/api/*` requests.

### Option A: Fully Serverless (Default)
Cloudflare will attempt to run your Express app inside its V8 isolates using `serverless-http`. 
*(Note: Some features like `multer` disk uploads or `setInterval` background tasks may have limitations in Cloudflare Workers).*

### Option B: Hybrid (Recommended for Full Compatibility)
If you want to host the React frontend on Cloudflare Pages for global speed, but keep your Express API running on your VPS/CPanel to preserve `multer` file uploads and background tasks:
1. Go to your Cloudflare Pages Dashboard -> Settings -> Environment Variables.
2. Add a new variable: `CF_API_TARGET` = `https://your-vps-domain.com`.
3. The Cloudflare Function will now automatically act as a reverse proxy, forwarding all `/api/*` requests directly to your VPS!

## How to Deploy:
1. **GitHub Actions**: Push your code to the `main` or `master` branch. Ensure you set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your GitHub repository secrets.
2. **Manual CLI Deploy**: Run `npx wrangler pages deploy dist` after building.
