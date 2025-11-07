# ⚡ Quick Fix: Firebase Credentials Error

## The Problem
```
❌ ERROR: Firebase credentials not found in production!
```

## The Solution (3 Steps)

### Step 1: Generate Firebase Credentials String

Run this command on your **local machine**:

```bash
npm run prepare-firebase-env
```

This will output a single-line JSON string. **Copy everything** between the dashed lines.

### Step 2: Add to Render Dashboard

1. Go to https://dashboard.render.com
2. Click on your service (e.g., `a2z-backend`)
3. Click **"Environment"** in the left sidebar
4. Click **"Add Environment Variable"**
5. Enter:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** (paste the JSON string from Step 1)
6. Click **"Save Changes"**

### Step 3: Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for deployment (2-5 minutes)
4. Check logs - you should see: `✅ Loaded Firebase credentials from environment variable`

## ✅ Verify It Worked

Visit: `https://your-app-name.onrender.com/health`

Should return: `{"status":"OK","message":"Firebase API server is running"}`

---

**Need more help?** See [FIX_FIREBASE_CREDENTIALS.md](FIX_FIREBASE_CREDENTIALS.md) for detailed instructions.

