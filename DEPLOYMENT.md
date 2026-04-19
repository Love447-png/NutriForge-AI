# Vercel Deployment Guide for NutriForge

This guide walks you through deploying your NutriForge application on Vercel.

## Important Note: Backend Deployment Required

**Vercel is optimized for frontend applications.** Your FastAPI backend cannot be deployed directly to Vercel. You have two options:

### Option 1: Deploy Backend Separately (Recommended)
Deploy your backend to Render, Railway, or AWS, then connect it to your Vercel frontend.

### Option 2: Use Vercel Serverless Functions (Advanced)
Convert your FastAPI app to Vercel serverless functions (requires significant code changes).

**This guide assumes Option 1** - deploying backend separately and frontend to Vercel.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel
3. Backend already deployed (see backend deployment options below)

## Architecture

- **Frontend**: React/Vite application on Vercel
- **Backend**: FastAPI application (deploy separately to Render/Railway/AWS)
- **Database**: PostgreSQL (managed by your backend provider)

## Step-by-Step Deployment

### 1. Deploy Backend First

Choose one of these options for your backend:

#### Option A: Deploy to Render (Recommended)
1. Follow the Render deployment guide in `render.yaml`
2. Note your backend URL: `https://nutriforge-backend.onrender.com`

#### Option B: Deploy to Railway
1. Create Railway project
2. Add Python service with your backend code
3. Note your backend URL

#### Option C: Deploy to AWS/Heroku
1. Use their respective deployment methods
2. Note your backend URL

### 2. Deploy Frontend to Vercel

#### Method 1: GitHub Integration (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository (`NutriForge-AI`)
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Set Environment Variables:
   ```
   VITE_API_BASE=https://your-backend-url.com/api
   ```

6. Click "Deploy"

#### Method 2: Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Set environment variable: `vercel env add VITE_API_BASE`

### 3. Update Backend CORS

After deployment, update your backend's `ALLOWED_ORIGINS` to include your Vercel domain:
```
ALLOWED_ORIGINS=https://nutriforge-[random].vercel.app
```

## Environment Variables

### Frontend Environment Variables
```
VITE_API_BASE=https://your-backend-url.com/api
```

### Backend Environment Variables (on your backend provider)
```
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET_KEY=[strong-random-key-32-chars-minimum]
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
LOG_LEVEL=INFO
LLM_MODEL=llama3.2:3b
VISION_MODEL=llava:7b
EMBED_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://ollama-service:11434
```

## Troubleshooting the 404 Error

The `404: NOT_FOUND` error you're seeing typically means:

### 1. Build Configuration Issues
- **Check Build Logs**: In Vercel dashboard → Project → Deployments → View Logs
- **Verify Build Settings**:
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist`

### 2. Routing Issues
- **Missing `vercel.json`**: Ensure `vercel.json` is in your project root
- **Incorrect Routes**: Verify the routes in `vercel.json` point to correct paths

### 3. API Proxy Issues
- **Backend URL**: Ensure `VITE_API_BASE` is set correctly
- **CORS**: Make sure backend allows requests from Vercel domain
- **Backend Status**: Verify backend is running and accessible

### 4. Build Output Issues
- **Check `dist` folder**: Run `npm run build` locally to ensure it creates `dist/`
- **Static Assets**: Ensure all assets are in the correct output directory

## Common Fixes

### Fix 1: Check Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-url.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### Fix 2: Verify Build Locally
```bash
cd frontend
npm run build
ls -la dist/  # Should contain index.html, assets/, etc.
```

### Fix 3: Check Environment Variables
- In Vercel dashboard: Project → Settings → Environment Variables
- Ensure `VITE_API_BASE` is set to your backend URL

### Fix 4: Redeploy
Sometimes a fresh deployment fixes issues:
- Vercel dashboard → Project → Deployments → Trigger new deployment

## Backend Deployment Options

### Quick Backend Deployment (Render)
1. Go to [render.com](https://render.com)
2. New → Blueprint
3. Connect your repo
4. Use the `render.yaml` configuration
5. Get your backend URL

### Alternative: Railway
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add services manually (see Railway docs)

## Next Steps

1. Deploy your backend first (Render recommended)
2. Update `vercel.json` with your backend URL
3. Deploy frontend to Vercel
4. Test the full application

## Support

- **Vercel Issues**: https://vercel.com/docs
- **Build Logs**: Check Vercel dashboard
- **Community**: Vercel Discord or GitHub issues
   VISION_MODEL=llava:7b
   EMBED_MODEL=nomic-embed-text
   PYTHONUNBUFFERED=1
   ```

5. Deploy the service

#### Frontend Service (React/Vite)

1. Click "Add Service" → "GitHub Repo"
2. Configure:
   - **Service Name**: `nutriforge-frontend`
   - **GitHub branch**: `codex/nutriforge-launch-polish`
   - **Root Directory**: `frontend`

3. Configure Build Settings:
   - **Dockerfile**: Select `frontend/Dockerfile`

4. Set Environment Variables:
   ```
   NODE_ENV=production
   VITE_API_BASE=https://[your-backend-url]/api
   ```

5. Deploy the service

#### Database Service

1. Click "Add Service" → "Database"
2. Select **PostgreSQL**
3. Railway will automatically set up the database
4. Copy the `DATABASE_URL` and add it to your backend service variables

### 3. Configure Domain Names

1. In **Railway Dashboard**, go to your project
2. For Backend Service:
   - Click the service
   - Go to **Settings** → **Domains**
   - Add a custom domain (e.g., `api.nutriforge.com`) or use Railway's auto-generated URL

3. For Frontend Service:
   - Click the service
   - Go to **Settings** → **Domains**
   - Add your main domain (e.g., `nutriforge.com`)
   - Update `VITE_API_BASE` in frontend environment variables to match backend domain

### 4. Critical Configuration Notes

**Important**: Your backend depends on:
- **Ollama models** - Make sure the Ollama service is accessible or provide remote URL
- **ChromaDB** - Vector store (SQLite-based, will work with Railway volumes)
- **Data persistence** - You may need Railway Volumes for persistent storage

To add volumes for persistent data:
1. Go to Backend Service → **Settings** → **Add Volume**
2. Create volume at `/app/app/data`
3. Configure upload directories and vector stores in this volume

### 5. Verify Deployment

Once deployed:

1. **Backend Health Check**:
   ```bash
   curl https://[backend-url]/api/health
   ```

2. **Frontend**: Visit `https://[frontend-url]`

3. **Check Logs**: 
   - Railway Dashboard → Service → **Logs** tab for any errors

## Environment Variables Reference

### Backend (.env for production)
```
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET_KEY=[strong-random-key-32-chars-minimum]
ALLOWED_ORIGINS=https://frontend-domain.com
LOG_LEVEL=INFO
LLM_MODEL=llama3.2:3b
VISION_MODEL=llava:7b
EMBED_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://ollama-service:11434
```

### Frontend (.env)
```
VITE_API_BASE=https://backend-domain.com/api
```

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` format is correct: `postgresql://user:pass@host:5432/dbname`
- Check PostgreSQL service is running in Railway

### Ollama Model Access
- If Ollama is on a separate machine, ensure it's accessible from Railway
- Update `OLLAMA_BASE_URL` to point to remote Ollama server
- Test with: `curl $OLLAMA_BASE_URL/api/tags`

### Frontend Can't Reach Backend
- Verify `VITE_API_BASE` env variable is set correctly
- Ensure CORS is enabled on backend
- Check both services are running (Railway dashboard)

### Build Failures
- Check Railway logs for specific errors
- Ensure all dependencies are in `requirements.txt` and `package.json`
- Verify Dockerfile paths are correct

## Next Steps

1. Push these deployment files to GitHub:
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push
   ```

2. Visit Railway.app and create your project as described above

3. Monitor deployment in Railway dashboard

4. Update DNS records to point to Railway domains if using custom domains

## Support

For Railway-specific issues, see: https://docs.railway.app
