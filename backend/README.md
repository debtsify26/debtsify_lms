# Debtsify Backend API

Python FastAPI backend for the Debtsify Loan Management System with Supabase integration.

## Features

- ✅ **Authentication**: JWT-based auth with Supabase
- ✅ **Loans Management**: CRUD operations for loans
- ✅ **Installments**: Track and manage payment schedules
- ✅ **Transactions**: Ledger management with analytics
- ✅ **Dashboard Analytics**: Real-time financial summaries
- ✅ **Row-Level Security**: Supabase RLS for data isolation

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Supabase** - PostgreSQL database with built-in auth
- **JWT** - Token-based authentication
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## Prerequisites

- Python 3.10 or higher
- Supabase account ([sign up here](https://supabase.com))
- pip (Python package manager)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (2-3 minutes)
3. Note down your project credentials:
   - `Project URL` (found in Settings > API)
   - `anon/public` key (found in Settings > API)
   - `service_role` key (found in Settings > API)

### 2. Set Up Database Schema

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `schema.sql`
5. Click **Run** to execute the SQL
6. Verify tables were created: Check **Table Editor** to see `users`, `loans`, `installments`, `transactions`

### 3. Install Python Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy the example env file
copy .env.example .env

# Edit .env and fill in your values:
```

Required environment variables:

```env
# Supabase (Get from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Secret (Generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=your_generated_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS (Your frontend URL)
CORS_ORIGINS=http://localhost:3000

# Environment
ENVIRONMENT=development

# Gemini API (Optional - for AI features)
GEMINI_API_KEY=your_gemini_api_key
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Run the Backend Server

```bash
# Make sure you're in the backend directory with venv activated
python main.py

# Or use uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc (Alternative docs)

## API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout

### Loans
- `POST /loans` - Create new loan
- `GET /loans` - Get all loans (with optional status filter)
- `GET /loans/{loan_id}` - Get specific loan
- `PATCH /loans/{loan_id}` - Update loan
- `DELETE /loans/{loan_id}` - Delete loan

### Installments
- `POST /installments` - Create installment
- `POST /installments/bulk` - Create multiple installments
- `GET /installments` - Get all installments (with filters)
- `GET /installments/{id}` - Get specific installment
- `PATCH /installments/{id}` - Update installment (record payment)
- `DELETE /installments/{id}` - Delete installment

### Transactions
- `POST /transactions` - Create transaction
- `GET /transactions` - Get all transactions
- `GET /transactions/{id}` - Get specific transaction
- `DELETE /transactions/{id}` - Delete transaction
- `GET /transactions/summary/financial` - Get financial summary for dashboard

## Authentication Flow

All endpoints (except `/auth/signup` and `/auth/login`) require authentication.

### 1. **Sign Up**
```bash
POST /auth/signup
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 2. **Login**
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 3. **Use Token in Requests**
```bash
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## Testing the API

### Using Swagger UI (Recommended)

1. Open http://localhost:8000/docs
2. Click **Authorize** button
3. Enter: `Bearer your_access_token_here`
4. Test endpoints directly in the browser

### Using curl

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get loans (with token)
curl -X GET http://localhost:8000/loans \
  -H "Authorization: Bearer your_access_token_here"
```

## Database Structure

### Tables

- **users** - User profiles (synced with Supabase Auth)
- **loans** - Loan records with type (TOTAL_RATE/DAILY_RATE)
- **installments** - Payment schedules
- **transactions** - Financial ledger entries

### Security

- **Row-Level Security (RLS)** enabled on all tables
- Users can only access their own data
- JWT tokens expire after 30 minutes (configurable)

## Development

### Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py               # Settings configuration
├── database.py             # Supabase client
├── schemas.py              # Pydantic models
├── auth.py                 # Authentication utilities
├── schema.sql              # Database schema
├── requirements.txt        # Python dependencies
└── routers/
    ├── __init__.py
    ├── auth_router.py      # Auth endpoints
    ├── loans_router.py     # Loans endpoints
    ├── installments_router.py
    └── transactions_router.py
```

### Adding New Endpoints

1. Create new router file in `routers/`
2. Import and include in `main.py`
3. Add authentication with `Depends(get_current_user_id)`

## Troubleshooting

### "Failed to create user" error

- Check Supabase email confirmation settings
- Verify SUPABASE_KEY is the `anon` key, not service_role

### CORS errors

- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Restart the server after changing `.env`

### Database connection errors

- Verify `SUPABASE_URL` is correct
- Check if Supabase project is active
- Ensure RLS policies are set up (run `schema.sql`)

### "Invalid credentials" on login

- Verify email/password are correct
- Check if user exists in Supabase Auth dashboard

## Production Deployment

### Environment Variables

Update `.env` for production:
```env
ENVIRONMENT=production
SECRET_KEY=use_a_very_strong_secret_key
CORS_ORIGINS=https://yourdomain.com
```

### Deployment Options

- **Heroku**: `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Railway**: Auto-detects FastAPI apps
- **Render**: Use Python runtime
- **AWS/GCP**: Deploy with Docker

## License

MIT License - See LICENSE file

## Support

For issues or questions:
1. Check the Swagger docs at `/docs`
2. Review Supabase logs in dashboard
3. Check server logs for errors
