<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hr5Zbfe-xeosFRJfjlMRdRR7_BpRort0

## Run Locally

**Prerequisites:**  Node.js

### Frontend Development

1. Install dependencies:
   `npm install`
2. (Optional) Create `.env.local` file if you want to use local backend:
   ```
   VITE_API_URL=http://localhost:3001
   ```
   By default, the app uses the deployed backend at `https://roadway-l7up.onrender.com`
3. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (if needed)
4. Run the app:
   `npm run dev`

### Backend API Server

1. Install dependencies:
   `npm install`
2. Place your `firebase-service-account.json` file in the project root
3. Run the server:
   `npm run server`
   
   Or with auto-reload:
   `npm run server:dev`
   
The API server will run on `http://localhost:3001`

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Quick Fix for Firebase Credentials Error

If you see `❌ ERROR: Firebase credentials not found in production!` on Render, see [FIX_FIREBASE_CREDENTIALS.md](FIX_FIREBASE_CREDENTIALS.md) for a step-by-step solution.

**Quick steps:**
1. Run `npm run prepare-firebase-env` locally
2. Copy the output JSON string
3. Add it as `FIREBASE_SERVICE_ACCOUNT` environment variable in Render dashboard
4. Redeploy your service
