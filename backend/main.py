from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from routers import auth_router, loans_router, installments_router, transactions_router, sync_router, investment_breakdown_router

# Create FastAPI app
app = FastAPI(
    title="Debtsify API",
    description="Backend API for Debtsify Loan Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router, prefix="/auth")
app.include_router(loans_router.router)
app.include_router(installments_router.router)
app.include_router(transactions_router.router)
app.include_router(sync_router.router)
app.include_router(investment_breakdown_router.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Debtsify API - VERIFIED v2",
        "version": "1.0.2",
        "docs": "/docs",
        "status": "online - auth-fixed"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.environment
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.environment == "development" else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True if settings.environment == "development" else False
    )
