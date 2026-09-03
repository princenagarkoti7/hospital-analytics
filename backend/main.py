
from db import get_connection
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import admission  # admission.py module import kiya
from routes import readmission  # readmission.py module import kiya
from routes import Member_ICDcodes  # Member_ICDcodes.py module import kiya

app = FastAPI(title="Hospital Analytics Backend API")

# Next.js Frontend ke sath connection ke liye CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admission module ke routes register karein
app.include_router(admission.router)
app.include_router(readmission.router)
app.include_router(Member_ICDcodes.router)

@app.get("/")
def root():
    return {"message": "Hospital Analytics API is running"}


@app.get("/api/db-test")
def db_test():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT GETDATE() AS server_time")
        row = cursor.fetchone()

        return {
            "success": True,
            "message": "SQL Server connection successful",
            "server_time": str(row.server_time)
        }

    except Exception as e:
        return {
            "success": False,
            "message": "SQL Server connection failed",
            "error": str(e)
        }

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
    
    
