# Debtsify - Complete Project Structure

```
debtsify/
│
├── 📱 FRONTEND (React + TypeScript)
│   ├── index.html                      # Entry HTML (with Tailwind CDN)
│   ├── index.tsx                       # React entry point
│   ├── App.tsx                         # Main app component
│   ├── types.ts                        # TypeScript type definitions
│   ├── vite.config.ts                  # Vite configuration
│   ├── tsconfig.json                   # TypeScript config
│   ├── package.json                    # Frontend dependencies
│   ├── .env.local                      # Gemini API key
│   │
│   ├── components/                     # React components
│   │   ├── Layout.tsx                  # App layout with sidebar
│   │   ├── Dashboard.tsx               # Dashboard with KPIs
│   │   ├── Loans.tsx                   # Loan calculator & management
│   │   ├── Installments.tsx            # Payment schedule tracker
│   │   ├── Ledger.tsx                  # Transaction ledger
│   │   └── AIAnalyst.tsx               # AI chat interface
│   │
│   ├── context/                        # React Context
│   │   └── DataContext.tsx             # Global state management
│   │
│   ├── hooks/                          # Custom React hooks
│   │   └── useLocalStorage.ts          # localStorage persistence
│   │
│   └── services/                       # External services
│       └── geminiService.ts            # Gemini AI integration
│
├── 🐍 BACKEND (Python + FastAPI)
│   ├── backend/
│   │   ├── main.py                     # ⭐ FastAPI app entry point
│   │   ├── config.py                   # Environment configuration
│   │   ├── database.py                 # Supabase client setup
│   │   ├── schemas.py                  # Pydantic data models
│   │   ├── auth.py                     # JWT authentication
│   │   ├── schema.sql                  # 🗄️ Database schema
│   │   │
│   │   ├── routers/                    # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth_router.py          # /auth/* endpoints
│   │   │   ├── loans_router.py         # /loans/* endpoints
│   │   │   ├── installments_router.py  # /installments/* endpoints
│   │   │   └── transactions_router.py  # /transactions/* endpoints
│   │   │
│   │   ├── requirements.txt            # Python dependencies
│   │   ├── .env.example                # Environment template
│   │   ├── .env                        # 🔐 Actual config (create this)
│   │   ├── .gitignore                  # Git ignore rules
│   │   ├── setup.ps1                   # 🚀 Automated setup script
│   │   ├── README.md                   # Backend documentation
│   │   └── Debtsify_API.postman_collection.json  # API tests
│   │
│   └── venv/                           # Python virtual environment
│
├── 📚 DOCUMENTATION
│   ├── README.md                       # Main project README
│   ├── QUICKSTART.md                   # 🚀 Step-by-step setup guide
│   ├── BACKEND_SUMMARY.md              # Complete backend overview
│   └── TROUBLESHOOTING.md              # Frontend troubleshooting
│
└── 📊 ASSETS
    └── debtsify_architecture.png       # Architecture diagram
```

---

## 🎯 Key Files Explained

### Frontend Core
- **index.html** - Loads Tailwind CSS, sets up React
- **App.tsx** - Main routing and view management
- **DataContext.tsx** - Manages loans, installments, transactions in state

### Backend Core  
- **main.py** - FastAPI app with CORS, router includes
- **schemas.py** - All data models mirroring frontend types
- **auth.py** - JWT token creation and validation
- **database.py** - Supabase PostgreSQL connection

### Setup & Config
- **backend/setup.ps1** - One-click backend setup
- **backend/.env** - All secrets and configuration
- **schema.sql** - Complete Supabase database schema

### Documentation
- **QUICKSTART.md** - Your go-to setup guide
- **BACKEND_SUMMARY.md** - Everything about the backend
- **backend/README.md** - Backend-specific docs

---

## 🚀 Quick Commands

### Frontend
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
.\setup.ps1          # First-time setup
python main.py       # Start server (port 8000)

# OR with uvicorn:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📍 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | React app |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| API Docs (Alt) | http://localhost:8000/redoc | ReDoc |
| Health Check | http://localhost:8000/health | Status |
| Supabase | https://supabase.com | Database dashboard |

---

## 🔐 Environment Variables

### Frontend (.env.local)
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Backend (.env)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SECRET_KEY=generated_secret_key
CORS_ORIGINS=http://localhost:3000
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| users | User profiles | id, email, full_name |
| loans | Loan records | id, type, principal_amount, status |
| installments | Payment schedules | id, loan_id, due_date, status |
| transactions | Financial ledger | id, amount, type, category |

---

## 🏗️ Technology Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (data visualization)
- Lucide React (icons)
- Google Gemini API (AI features)

### Backend
- Python 3.10+
- FastAPI (web framework)
- Supabase (PostgreSQL database)
- JWT (authentication)
- Pydantic (validation)
- Uvicorn (ASGI server)

---

## ✅ Current Status

| Component | Status | Port | Ready? |
|-----------|--------|------|--------|
| Frontend | ✅ Running | 3000 | Yes |
| Backend | ⚙️ Setup ready | 8000 | Setup needed |
| Database | ⚙️ Schema ready | - | Create in Supabase |
| Integration | ⏳ Pending | - | Next step |

---

## 🎯 Next Steps

1. **Setup Supabase** (10 min)
   - Create project at supabase.com
   - Run schema.sql in SQL Editor
   - Get API credentials

2. **Configure Backend** (5 min)
   - Run `backend\setup.ps1`
   - Update `backend\.env`
   - Start with `python main.py`

3. **Integrate Frontend** (30-60 min)
   - Add login/signup screens
   - Replace localStorage with API calls
   - Add authentication context
   - Handle loading/error states

---

This structure gives you a complete full-stack application ready for production! 🚀
