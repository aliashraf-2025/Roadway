# Render.com Deployment Guide - Step by Step

This guide will walk you through deploying your A2Z Backend API to Render.com.

## ✅ Prerequisites Checklist

- [ ] GitHub repository with your code
- [ ] Render.com account (free tier works)
- [ ] Firebase project credentials

## 📋 Step-by-Step Deployment

### Step 1: Prepare Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **a2z-app-3ea59**
3. Navigate to **Project Settings** → **Service Accounts** tab
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON file (you'll need its contents)

### Step 2: Deploy to Render

#### 2.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button → Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: **Roadway** (or your repo name)
5. Click **"Connect"**

#### 2.2 Configure Service Settings

Fill in the following settings:

- **Name:** `a2z-backend` (or any name you prefer)
- **Region:** Choose closest to your users
- **Branch:** `main` (or your default branch)
- **Root Directory:** Leave **empty** (project is in root)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### 2.3 Set Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"**

Add the following environment variables:

**1. NODE_ENV (Required)**
```
Key: NODE_ENV
Value: production
```

**2. FIREBASE_SERVICE_ACCOUNT (Required)**

This is the most important step! You have two options:

**Option A: Single Environment Variable (Recommended)**

1. Open your `firebase-service-account.json` file
2. Copy the **entire contents** of the file
3. Convert it to a **single line** (remove all line breaks and extra spaces)
   - You can use an online JSON minifier: https://jsonformatter.org/json-minify
   - Or use this command: `cat firebase-service-account.json | jq -c`
4. Add environment variable:
   ```
   Key: FIREBASE_SERVICE_ACCOUNT
   Value: {"type":"service_account","project_id":"a2z-app-3ea59",...}
   ```
   ⚠️ **Important:** Paste the entire JSON as a single line without line breaks

**Option B: Individual Environment Variables**

If Option A doesn't work, you can set individual variables:

```
Key: FIREBASE_PROJECT_ID
Value: a2z-app-3ea59

Key: FIREBASE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDDUhjNtR0Jqcni\n... (entire key with \n for newlines)

Key: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@a2z-app-3ea59.iam.gserviceaccount.com
```

#### 2.4 Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Render will start building and deploying your service
4. Wait for deployment to complete (usually 2-5 minutes)

### Step 3: Verify Deployment

Once deployment is complete:

1. **Check Health Endpoint:**
   ```
   GET https://your-app-name.onrender.com/health
   ```
   Should return: `{"status":"OK","message":"Firebase API server is running"}`

2. **Test an API Endpoint:**
   ```
   GET https://your-app-name.onrender.com/api/users
   ```

3. **Check Logs:**
   - Go to Render Dashboard → Your Service → **"Logs"** tab
   - Look for: `✅ Firebase Admin SDK initialized successfully`
   - Look for: `🚀 Firebase API server running on http://0.0.0.0:XXXX`

## 🔍 Troubleshooting

### Error: "Cannot find module '/opt/render/project/src/index.js'"

**Solution:**
1. Go to Render Dashboard → Your Service → **Settings**
2. Check **"Start Command"** - it should be: `npm start`
3. If it's different, change it to: `npm start`
4. Click **"Save Changes"** and redeploy

### Error: "Firebase service account not found"

**Solution:**
1. Check that `FIREBASE_SERVICE_ACCOUNT` environment variable is set
2. Make sure the JSON is valid and on a single line
3. Check logs for specific error messages
4. Verify the JSON content matches your `firebase-service-account.json` file

### Error: "Error parsing FIREBASE_SERVICE_ACCOUNT env var"

**Solution:**
1. Make sure the JSON is properly formatted (valid JSON)
2. Ensure it's on a single line (no line breaks)
3. Try using a JSON minifier to convert it properly
4. Check that all quotes are escaped if needed

### Service Keeps Restarting

**Solution:**
1. Check the **Logs** tab for error messages
2. Common causes:
   - Missing `FIREBASE_SERVICE_ACCOUNT` environment variable
   - Invalid JSON in `FIREBASE_SERVICE_ACCOUNT`
   - Port binding issues (should be automatic)
   - Firebase permission issues

### Build Fails

**Solution:**
1. Check build logs for specific errors
2. Ensure `package.json` has all required dependencies
3. Verify Node.js version compatibility
4. Check that all files are committed to Git

## 📝 Quick Reference

### Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ Yes | Full Firebase service account JSON (single line) |
| `PORT` | ❌ No | Automatically set by Render |
| `HOST` | ❌ No | Automatically set by Render |

### Important Files

- `server.js` - Main server file
- `index.js` - Entry point wrapper
- `package.json` - Dependencies and scripts
- `render.yaml` - Render configuration (optional)
- `Procfile` - Process file (optional)

### API Endpoints

Once deployed, your API will be available at:
- Base URL: `https://your-app-name.onrender.com`
- Health Check: `https://your-app-name.onrender.com/health`
- API: `https://your-app-name.onrender.com/api/*`

## 🔐 Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `firebase-service-account.json` to Git** (already in `.gitignore`)
2. **Use environment variables** for all secrets in production
3. **Keep your Firebase credentials secure**
4. **Regularly rotate service account keys**
5. **Use Render's environment variable encryption** (secrets are encrypted at rest)

## 🚀 Next Steps

After successful deployment:

1. **Update Frontend API URL:**
   - If you have a separate frontend, update the API URL to point to your Render service
   - Example: `VITE_API_URL=https://your-app-name.onrender.com`

2. **Set Up Auto-Deploy:**
   - Render automatically deploys on every push to your main branch
   - You can change this in Settings → **Auto-Deploy**

3. **Monitor Your Service:**
   - Check logs regularly
   - Set up alerts for downtime
   - Monitor API usage

4. **Consider Upgrading:**
   - Free tier services spin down after 15 minutes of inactivity
   - Paid plans offer:
     - No sleep/spin-down
     - Better performance
     - More resources
     - Priority support

## 💡 Pro Tips

1. **Use Render's Blueprint (render.yaml):**
   - Automates service creation
   - Version controls your infrastructure
   - Makes deployments repeatable

2. **Enable Health Checks:**
   - Render automatically monitors `/health` endpoint
   - Service auto-restarts if health check fails

3. **Use Render's Logs:**
   - Real-time log streaming
   - Easy debugging
   - Log retention for troubleshooting

4. **Test Locally First:**
   - Use environment variables locally before deploying
   - Test with: `NODE_ENV=production npm start`

## 📞 Need Help?

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Deployment Status:** ✅ Ready for Render.com

**Last Updated:** 2024

