from fastapi import APIRouter, HTTPException, Query
from db import get_connection

router = APIRouter(
    prefix="/api/icd",
    tags=["ICD Registry"]
)

# 1. Fetch Unique Descriptions for the Conditions Filter Dropdown
@router.get("/conditions")
def get_unique_conditions():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT RTRIM(LTRIM(LONG_DESCRIPTION)) AS condition_desc
            FROM dbo.Member_ICDcodes
            WHERE LONG_DESCRIPTION IS NOT NULL 
              AND LTRIM(RTRIM(LONG_DESCRIPTION)) <> ''
            ORDER BY condition_desc ASC
        """)

        conditions = [row[0] for row in cursor.fetchall()]
        return {"success": True, "conditions": conditions}

    except Exception as e:
        print("Database Error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch conditions")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# 2. Paginated Registry Records
@router.get("/registry")
def get_icd_registry(
    search: str = Query("", description="Search by Member ID, Diagnosis, Claim, or Description"),
    condition: str = Query("All conditions", description="Unique Long Description filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        offset = (page - 1) * page_size
        where_clauses = ["DIAGNOSIS IS NOT NULL"]
        params = []

        # Search filter
        if search.strip():
            where_clauses.append("""
                (CAST(MEMBER_NUMBER AS VARCHAR(50)) LIKE ?
                 OR CAST(CLAIM_NUMBER AS VARCHAR(50)) LIKE ?
                 OR DIAGNOSIS LIKE ? 
                 OR LONG_DESCRIPTION LIKE ?
                 OR MEMBER_FIRST_NAME LIKE ?
                 OR MEMBER_LAST_NAME LIKE ?)
            """)
            s = f"%{search.strip()}%"
            params.extend([s, s, s, s, s, s])

        # Dynamic Description Condition filter
        if condition and condition != "All conditions":
            where_clauses.append("LTRIM(RTRIM(LONG_DESCRIPTION)) = ?")
            params.append(condition.strip())

        where_sql = " AND ".join(where_clauses)

        # Count Query
        count_query = f"""
            SELECT COUNT(*) 
            FROM dbo.Member_ICDcodes
            WHERE {where_sql}
        """
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0] or 0

        # Data Query with exact table columns
        data_query = f"""
            SELECT 
                CAST(MEMBER_NUMBER AS VARCHAR(50)) AS MEMBER_NUMBER,
                LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS MEMBER_NAME,
                DIAGNOSIS,
                CAST(CLAIM_NUMBER AS VARCHAR(50)) AS CLAIM_NUMBER,
                COALESCE(CONVERT(VARCHAR(10), PAID_DATE, 120), 'N/A') AS PAID_DATE,
                COALESCE(LONG_DESCRIPTION, 'No description available') AS DESCRIPTION
            FROM dbo.Member_ICDcodes
            WHERE {where_sql}
            ORDER BY MEMBER_NUMBER ASC
            OFFSET ? ROWS
            FETCH NEXT ? ROWS ONLY
        """
        data_params = params + [offset, page_size]
        cursor.execute(data_query, data_params)

        columns = [col[0] for col in cursor.description]
        records = [dict(zip(columns, row)) for row in cursor.fetchall()]

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0

        return {
            "success": True,
            "data": records,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_records": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }

    except Exception as e:
        print("Database Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve ICD diagnosis data: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()