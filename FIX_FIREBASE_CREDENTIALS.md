# 🔧 Fix: Firebase Credentials Error on Render

If you're seeing this error:
```
❌ ERROR: Firebase credentials not found in production!
```

This means the `FIREBASE_SERVICE_ACCOUNT` environment variable is not set in your Render dashboard.

## 🚀 Quick Fix (5 minutes)

### Step 1: Prepare Your Firebase Credentials

**On your local machine**, run this command in your project directory:

```bash
npm run prepare-firebase-env
```

This will output a single-line JSON string. **Copy the entire output** (the long JSON string between the lines).

### Step 2: Add Environment Variable in Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in to your account

2. **Navigate to Your Service**
   - Click on your service name (e.g., `a2z-backend`)

3. **Go to Environment Tab**
   - Click on **"Environment"** in the left sidebar

4. **Add New Environment Variable**
   - Scroll down to **"Environment Variables"** section
   - Click **"Add Environment Variable"** button
   - Enter:
     - **Key:** `FIREBASE_SERVICE_ACCOUNT`
     - **Value:** Paste the JSON string you copied from Step 1
   - Click **"Save Changes"**

5. **Redeploy Your Service**
   - Go to **"Manual Deploy"** tab (or it may auto-deploy)
   - Click **"Deploy latest commit"** (or wait for auto-deploy)
   - Wait for deployment to complete (2-5 minutes)

### Step 3: Verify It Works

1. **Check the Logs**
   - Go to **"Logs"** tab in Render
   - Look for: `✅ Loaded Firebase credentials from environment variable (FIREBASE_SERVICE_ACCOUNT)`
   - Look for: `✅ Firebase Admin SDK initialized successfully`

2. **Test the Health Endpoint**
   - Visit: `https://your-app-name.onrender.com/health`
   - Should return: `{"status":"OK","message":"Firebase API server is running"}`

## 📸 Visual Guide

### Render Dashboard Navigation

```
Render Dashboard
└── Your Service (e.g., a2z-backend)
    ├── Overview
    ├── Logs
    ├── Metrics
    ├── Environment  ← Click here
    ├── Settings
    └── Manual Deploy
```

### Environment Variables Section

```
Environment Variables
┌─────────────────────────────────────────┐
│ Add Environment Variable                │
├─────────────────────────────────────────┤
│ Key:   FIREBASE_SERVICE_ACCOUNT        │
│ Value: {"type":"service_account",...}   │
│        [Paste your JSON here]           │
│                                         │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### Problem: "Error parsing FIREBASE_SERVICE_ACCOUNT env var"

**Solution:**
- Make sure the JSON is on a **single line** (no line breaks)
- Ensure it's valid JSON (use `npm run prepare-firebase-env` to generate it correctly)
- Check that you copied the entire string without truncation

### Problem: Still getting "Firebase credentials not found"

**Solution:**
1. Verify the environment variable is saved:
   - Go to Environment tab
   - Check that `FIREBASE_SERVICE_ACCOUNT` appears in the list
   - Verify it shows the correct character count

2. Check the logs for debug info:
   - Look for: `🔍 Environment Variables Check:`
   - Should show: `FIREBASE_SERVICE_ACCOUNT: ✅ Set (XXXX chars)`

3. Make sure you redeployed after adding the variable:
   - Environment variables only take effect after redeployment
   - Go to Manual Deploy → Deploy latest commit

### Problem: JSON is too long to paste

**Solution:**
- Use the `npm run prepare-firebase-env` script - it outputs a single line
- Copy the entire output (it's one long line)
- If Render's UI truncates it, try:
  - Using Render CLI to set it
  - Or use individual environment variables (see alternative below)

## 🔄 Alternative: Individual Environment Variables

If setting `FIREBASE_SERVICE_ACCOUNT` doesn't work, you can use individual variables:

1. Open your `firebase-service-account.json` file
2. Set these environment variables in Render:

```
FIREBASE_PROJECT_ID=a2z-app-3ea59
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADAN...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@a2z-app-3ea59.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=103978264410200767219
FIREBASE_PRIVATE_KEY_ID=8e1323c64522818ea4b5b2a0adcd5aaf872aadf5
```

**Note:** For `FIREBASE_PRIVATE_KEY`, replace actual newlines with `\n` in the value.

## ✅ Verification Checklist

After setting up, verify:

- [ ] Environment variable `FIREBASE_SERVICE_ACCOUNT` is set in Render
- [ ] Service has been redeployed after adding the variable
- [ ] Logs show: `✅ Loaded Firebase credentials from environment variable`
- [ ] Logs show: `✅ Firebase Admin SDK initialized successfully`
- [ ] Health endpoint returns: `{"status":"OK","message":"Firebase API server is running"}`
- [ ] API endpoints are responding correctly

## 📞 Still Need Help?

1. Check the logs in Render Dashboard → Logs tab
2. Look for any error messages
3. Verify all environment variables are set correctly
4. Check [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed instructions

---

**Quick Command Reference:**

```bash
# Prepare Firebase credentials
npm run prepare-firebase-env

# Test locally with production mode
NODE_ENV=production npm start
```

