# 🚀 Render Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.com.

## Pre-Deployment

- [ ] **Code is committed to GitHub**
  - [ ] All changes are pushed to your repository
  - [ ] `server.js` is in the root directory
  - [ ] `package.json` has correct `start` script: `"start": "node server.js"`
  - [ ] `index.js` exists (wrapper file)

- [ ] **Firebase Credentials Ready**
  - [ ] Downloaded `firebase-service-account.json` from Firebase Console
  - [ ] File is in project root (for local development)
  - [ ] File is in `.gitignore` (should not be committed)

- [ ] **Test Locally**
  - [ ] Server starts with: `npm start`
  - [ ] Health endpoint works: `http://localhost:3001/health`
  - [ ] Firebase connection works
  - [ ] API endpoints respond correctly

## Render Setup

- [ ] **Create Render Account**
  - [ ] Sign up at [render.com](https://render.com)
  - [ ] Connect GitHub account

- [ ] **Create Web Service**
  - [ ] Click "New +" → "Web Service"
  - [ ] Connect your GitHub repository
  - [ ] Select correct branch (usually `main`)

- [ ] **Configure Service Settings**
  - [ ] Name: `a2z-backend` (or your preferred name)
  - [ ] Region: Choose closest to your users
  - [ ] Branch: `main`
  - [ ] Root Directory: **Leave empty**
  - [ ] Runtime: `Node`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`

- [ ] **Set Environment Variables**
  - [ ] `NODE_ENV` = `production`
  - [ ] `FIREBASE_SERVICE_ACCOUNT` = (single-line JSON)
    - Use `npm run prepare-firebase-env` to generate
    - Or manually minify `firebase-service-account.json`

## Deployment

- [ ] **Deploy Service**
  - [ ] Click "Create Web Service"
  - [ ] Wait for build to complete (2-5 minutes)
  - [ ] Check build logs for errors

- [ ] **Verify Deployment**
  - [ ] Health check: `https://your-app.onrender.com/health`
  - [ ] Check logs for: `✅ Firebase Admin SDK initialized successfully`
  - [ ] Check logs for: `🚀 Firebase API server running`
  - [ ] Test API endpoint: `https://your-app.onrender.com/api/users`

## Post-Deployment

- [ ] **Update Frontend** (if applicable)
  - [ ] Update API URL to Render service URL
  - [ ] Set `VITE_API_URL=https://your-app.onrender.com`
  - [ ] Test frontend connection to backend

- [ ] **Monitor Service**
  - [ ] Check Render dashboard for service status
  - [ ] Review logs for any errors
  - [ ] Test all API endpoints
  - [ ] Verify Firebase operations work

- [ ] **Documentation**
  - [ ] Save your Render service URL
  - [ ] Document environment variables used
  - [ ] Update API documentation with new URLs

## Troubleshooting

If deployment fails, check:

- [ ] Build logs for npm install errors
- [ ] Runtime logs for Firebase credential errors
- [ ] Environment variables are set correctly
- [ ] Start command is `npm start`
- [ ] All files are committed to Git
- [ ] Firebase credentials are valid

## Quick Commands

```bash
# Prepare Firebase credentials for Render
npm run prepare-firebase-env

# Test locally with production settings
NODE_ENV=production npm start

# Test health endpoint
curl https://your-app.onrender.com/health
```

## Support Resources

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Status:** ✅ Ready to deploy

**Last Updated:** 2024

