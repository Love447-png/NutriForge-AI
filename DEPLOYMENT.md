# Render Deployment Guide for NutriForge

This guide walks you through deploying your full-stack NutriForge application on Render.

## Prerequisites

1. Render account (sign up at https://render.com)
2. GitHub repository (your code must be pushed to GitHub)
3. GitHub connected to Render

## Architecture

Your deployment consists of:
- **Backend**: FastAPI Python application on Render Web Service
- **Frontend**: React/Vite application on Render Static Site
- **Database**: PostgreSQL (Render-managed)

## Step-by-Step Deployment

### 1. Connect GitHub to Render

1. Go to [render.com](https://render.com)
2. Click "New" → "Blueprint" (or "Web Service" for individual services)
3. Connect your GitHub account
4. Select your `NutriForge-AI` repository

### 2. Deploy Using Blueprint (Recommended)

If you have the `render.yaml` file in your repository:

1. In Render dashboard, click "New" → "Blueprint"
2. Select your repository
3. Render will automatically detect the `render.yaml` file
4. Click "Apply" to create all services at once

### 3. Manual Service Creation (Alternative)

#### Backend Service (FastAPI)

1. Click "New" → "Web Service"
2. Configure:
   - **Name**: `nutriforge-backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && alembic upgrade head || true`
   - **Start Command**: `gunicorn app.main:create_app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

3. Set Environment Variables:
   ```
   ENVIRONMENT=production
   LOG_LEVEL=INFO
   DATABASE_URL=[Render will provide this from database]
   JWT_SECRET_KEY=[Generate a strong 32+ character key]
   ALLOWED_ORIGINS=https://[your-frontend-url]
   OLLAMA_BASE_URL=http://localhost:11434  # Update if using remote Ollama
   LLM_MODEL=llama3.2:3b
   VISION_MODEL=llava:7b
   EMBED_MODEL=nomic-embed-text
   PYTHONUNBUFFERED=1
   ```

4. Deploy the service

#### Frontend Service (React/Vite)

1. Click "New" → "Static Site"
2. Configure:
   - **Name**: `nutriforge-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. Set Environment Variables:
   ```
   NODE_ENV=production
   VITE_API_BASE=https://[your-backend-url]
   ```

4. Deploy the service

#### Database Service

1. Click "New" → "PostgreSQL"
2. Configure:
   - **Name**: `nutriforge-db`
   - **Database**: `nutriforge`
   - **User**: `nutriforge_user`
   - **Plan**: Starter (free tier)

3. Render will automatically provide the `DATABASE_URL`

### 4. Service Configuration

**Important**: After deployment, update the CORS settings:

1. In Backend service → Environment
2. Update `ALLOWED_ORIGINS` to your frontend URL: `https://nutriforge-frontend.onrender.com`
3. Update Frontend `VITE_API_BASE` to your backend URL: `https://nutriforge-backend.onrender.com`

### 5. Critical Configuration Notes

**Important**: Your backend depends on:
- **Ollama models** - Make sure the Ollama service is accessible or provide remote URL
- **ChromaDB** - Vector store (uses SQLite, works with Render's persistent disks)
- **Data persistence** - Consider using Render's persistent disks for uploads/vector store

To add persistent storage:
1. In Backend Service → Settings → Persistent Disk
2. Create disk at `/opt/render/project/app/data`
3. Configure upload directories and vector stores in this volume

### 6. Verify Deployment

Once deployed:

1. **Backend Health Check**:
   ```bash
   curl https://nutriforge-backend.onrender.com/api/health
   ```

2. **Frontend**: Visit `https://nutriforge-frontend.onrender.com`

3. **Check Logs**:
   - Render Dashboard → Service → Logs tab for any errors

## Environment Variables Reference

### Backend (.env for production)
```
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET_KEY=[strong-random-key-32-chars-minimum]
ALLOWED_ORIGINS=https://frontend-domain.onrender.com
LOG_LEVEL=INFO
LLM_MODEL=llama3.2:3b
VISION_MODEL=llava:7b
EMBED_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://ollama-service:11434
```

### Frontend (.env)
```
VITE_API_BASE=https://backend-domain.onrender.com
```

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` format is correct: `postgresql://user:pass@host:5432/dbname`
- Check PostgreSQL service is running in Render

### Ollama Model Access
- If Ollama is on a separate machine, ensure it's accessible from Render
- Update `OLLAMA_BASE_URL` to point to remote Ollama server
- Test with: `curl $OLLAMA_BASE_URL/api/tags`

### Frontend Can't Reach Backend
- Verify `VITE_API_BASE` env variable is set correctly
- Ensure CORS is enabled on backend
- Check both services are running (Render dashboard)

### Build Failures
- Check Render logs for specific errors
- Ensure all dependencies are in `requirements.txt` and `package.json`
- Verify Python version compatibility (Render uses Python 3.11+)

### Free Tier Limitations
- Render's free tier sleeps after 15 minutes of inactivity
- Cold starts may take 30-60 seconds
- Consider upgrading to paid plans for production use

## Next Steps

1. Push these deployment files to GitHub:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push
   ```

2. Visit Render.com and create your project as described above

3. Monitor deployment in Render dashboard

4. Update DNS records to point to Render domains if using custom domains

## Support

For Render-specific issues, see: https://docs.render.com
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
