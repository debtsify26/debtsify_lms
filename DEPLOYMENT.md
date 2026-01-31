# Deployment Guide for Debtsify

This guide explains how to deploy the Debtsify full-stack application. We will use:
- **Frontend**: Vercel (Recommended for Vite/React) or Netlify
- **Backend**: Render (Recommended for Python/FastAPI) or Railway
- **Database**: Supabase (Cloud-hosted)

---

## 0. Push to GitHub

Current Remote: `https://github.com/debtsify26/debtsify_lms.git`

Before deploying, ensure your code is on GitHub:
```bash
# 1. Rename branch to main (if not already)
git branch -M main

# 2. Push to the new repository
git push -u origin main
```

---

## 1. Database (Supabase)

Your database is already on the cloud (Supabase)! You just need to ensure your production environment variables are ready.
- Go to [Supabase Dashboard](https://supabase.com/dashboard) -> Project Settings -> API.
- You will need:
  - `Project URL`
  - `anon` public key
  - `service_role` secret key (keep this safe!)

---

## 2. Backend Deployment (Render.com)

Render is excellent for Python apps and offers a free tier.

1.  **Push your code to GitHub/GitLab**. Ensure your repo is public or private (Render supports both).
2.  **Create a Web Service** on Render:
    - Connect your repository.
    - **Root Directory**: `backend` (Important! Your python code is in this folder).
    - **Runtime**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3.  **Environment Variables**:
    - Add the following variables in the Render dashboard:
      - `PYTHON_VERSION`: `3.10.0` (or your local version)
      - `SUPABASE_URL`: (from Supabase)
      - `SUPABASE_KEY`: (from Supabase - anon key is fine if RLS is set, otherwise service_role for backend)
      - `Access-Control-Allow-Origin` or `CORS_ORIGINS`: You will update this LATER with your Frontend URL.
      - `SECRET_KEY`: A random string for JWT.
      - `ENVIRONMENT`: `production`

4.  **Deploy**. Render will build and start your service. You will get a URL like `https://debtsify-backend.onrender.com`.

---

## 3. Frontend Deployment (Vercel)

Vercel is the creators of Next.js but also the best place for Vite apps.

1.  **Import Project**:
    - Go to Vercel Dashboard -> Add New -> Project.
    - Select your Git repository.
2.  **Configure Project**:
    - **Framework Preset**: Vite
    - **Root Directory**: `.` (default) or just leave empty if it's the root.
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
3.  **Environment Variables**:
    - Add `.env.local` variables here:
      - `VITE_API_URL`: Your NEW Backend URL (e.g., `https://debtsify-backend.onrender.com`). **Note**: You might need to update your frontend code to use this variable instead of hardcoded `localhost`.
      - `VITE_GEMINI_API_KEY`: Your Gemini API key.
4.  **Deploy**. Vercel will give you a URL like `https://debtsify.vercel.app`.

---

## 4. Final Configuration

1.  **Update CORS on Backend**:
    - Go back to Render Dashboard -> Environment Variables.
    - Update `CORS_ORIGINS` to include your new Vercel URL (e.g., `https://debtsify.vercel.app`).
    - This allows the frontend to talk to the backend.

2.  **Update Frontend API Calls**:
    - Ensure your frontend code points to the production backend.
    - In `services/api.ts` or wherever you fetch data, use `import.meta.env.VITE_API_URL` or similar.

---

## Summary of URLs

- **Frontend**: `https://debtsify.vercel.app` (User visits this)
- **Backend**: `https://debtsify-backend.onrender.com` (Frontend talks to this)
- **Database**: `https://xxx.supabase.co` (Backend talks to this)
