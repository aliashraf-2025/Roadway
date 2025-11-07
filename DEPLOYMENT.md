# Render Deployment Guide

This guide explains how to deploy the A2Z Backend API to Render.

> **📖 For detailed step-by-step instructions, see [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)**

## Prerequisites

- A Render account (free tier is sufficient)
- Firebase project credentials

## Step 1: Prepare Firebase Credentials

You need to set up a Firebase Service Account for your backend to access Firestore and Firebase Auth.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `a2z-app-3ea59`
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON file (you'll need its contents)

## Step 2: Deploy to Render

### Option A: Using Render Dashboard (Recommended)

1. **Create a new Web Service:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect your repository:**
   - Connect your GitHub repository
   - Select the `Roadway` repository

3. **Configure the service:**
   - **Name:** `a2z-backend` (or any name you prefer)
   - **Environment:** `Node`
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** Leave empty (project is in root)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

4. **Add Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"** and add:
   
   ```
   Key: NODE_ENV
   Value: production
   ```
   
   For Firebase credentials, you have two options:

   **Option 1 (Recommended):** Set `FIREBASE_SERVICE_ACCOUNT`
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: The entire JSON content from the service account file, as a single-line string
   - Example: `{"type":"service_account","project_id":"a2z-app-3ea59",...}`
   
   **Option 2:** Add individual Firebase credentials:
   - If needed, you can add each field as a separate env var and modify `server.js`

5. **Deploy:**
   - Click **"Create Web Service"**
   - Render will start building and deploying your backend

### Option B: Using Render.yaml (Infrastructure as Code)

The repository already includes a `render.yaml` file. To use it:

1. Go to Render Dashboard → **New +** → **Blueprint**
2. Connect your GitHub repository
3. Select `render.yaml`
4. Add the environment variable `FIREBASE_SERVICE_ACCOUNT` in the service settings
5. Render will automatically create the service

## Step 3: Verify Deployment

Once deployed, you can test your backend:

1. **Health Check:**
   ```
   https://your-app-name.onrender.com/health
   ```
   Should return: `{"status":"OK","message":"Firebase API server is running"}`

2. **Test an Endpoint:**
   ```
   GET https://your-app-name.onrender.com/api/users
   ```

## Step 4: Update Frontend API URL

If you have a separate frontend deployment, update the API URL:

1. In your frontend `.env` or environment configuration
2. Set `VITE_API_URL=https://your-app-name.onrender.com`
3. Redeploy your frontend

## Troubleshooting

### Build Fails

- Check the build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Runtime Errors

- Check the logs tab in Render dashboard
- Common issues:
  - Missing `FIREBASE_SERVICE_ACCOUNT` environment variable
  - Firebase permissions issue
  - Port binding errors (should be automatic)

### "Cannot find module '/opt/render/project/src/index.js'"

If you see this error, it means Render is using the wrong start command:

1. **Go to Render Dashboard** → Your Service → **Settings**
2. **Scroll to "Start Command"**
3. **Verify it says:** `npm start` or `node server.js`
4. **If it says:** `node index.js`, that's fine too (we created an index.js wrapper)
5. **Important:** Make sure NO custom start command is overriding `npm start`
6. **Click "Save Changes"** and redeploy

If this doesn't work:
- Double-check that you've committed and pushed `index.js`, `server.js`, and `package.json` to your GitHub repo
- Ensure Render is pulling from the correct branch
- Try manually setting the start command to: `node server.js`

### Service Goes to Sleep

On the free tier, services spin down after 15 minutes of inactivity. They automatically wake up on the next request, but the first request after sleep takes ~30 seconds.

### CORS Issues

The backend already has `cors()` middleware enabled for all origins. If you need to restrict origins, modify `server.js`.

## Environment Variables Summary

Required for production:
- `NODE_ENV=production`
- `FIREBASE_SERVICE_ACCOUNT=<full JSON string>`

Optional:
- `PORT` - Set automatically by Render (don't override)

## Next Steps

- Set up automatic deployments from your `main` branch
- Consider upgrading to a paid plan for:
  - No sleep/spin-down
  - Better performance
  - More resources
- Add monitoring and alerting

## Security Notes

⚠️ **Important:**
- Never commit `firebase-service-account.json` to Git (already in `.gitignore`)
- Use environment variables for all secrets
- Keep your Firebase credentials secure
- Regularly rotate service account keys

