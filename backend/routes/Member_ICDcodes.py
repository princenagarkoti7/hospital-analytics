from fastapi import APIRouter, HTTPException, Query
from db import get_connection

router = APIRouter(
    prefix="/api/icd",
    tags=["ICD Registry"]
)

# 1. Unique Descriptions Dropdown
@router.get("/conditions")
def get_unique_conditions():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT LTRIM(RTRIM(LONG_DESCRIPTION)) AS condition_desc
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
        if cursor: cursor.close()
        if conn: conn.close()


# 2. Registry List Query
@router.get("/registry")
def get_icd_registry(
    search: str = Query("", description="Search by Member ID, Diagnosis, Claim, or Description"),
    condition: str = Query("All conditions", description="Unique Long Description filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=250)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        offset = (page - 1) * page_size
        where_clauses = ["DIAGNOSIS IS NOT NULL"]
        params = []

        if search.strip():
            where_clauses.append("""
                (CAST(MEMBER_NUMBER AS VARCHAR(50)) LIKE ?
                 OR CAST(CLAIM_NUMBER AS VARCHAR(50)) LIKE ?
                 OR DIAGNOSIS LIKE ? 
                 OR LONG_DESCRIPTION LIKE ?
                 OR MEMBER_FIRST_NAME LIKE ?
                 OR PCP_NUMBER LIKE ?
                 OR LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) LIKE ?
                 OR MEMBER_LAST_NAME LIKE ?)
            """)
            s = f"%{search.strip()}%"
            params.extend([s, s, s, s, s, s,s,s])

        if condition and condition != "All conditions":
            where_clauses.append("LTRIM(RTRIM(LONG_DESCRIPTION)) = ?")
            params.append(condition.strip())

        where_sql = " AND ".join(where_clauses)

        count_query = f"SELECT COUNT(*) FROM dbo.Member_ICDcodes WHERE {where_sql}"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0] or 0

        data_query = f"""
            SELECT 
                CAST(COALESCE(PCP_NUMBER, 'N/A') AS VARCHAR(50)) AS PCP_NUMBER,
                LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) AS PCP_FULL_NAME,
                COALESCE(CAST([V24_Code] AS VARCHAR(50)), 'N/A') AS TARGET_HCC_V24,
                COALESCE(CAST([V28_Code] AS VARCHAR(100)), 'ICD Code removed from V28') AS TARGET_HCC_V28,
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
        cursor.execute(data_query, params + [offset, page_size])

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
        raise HTTPException(status_code=500, detail=f"Failed to retrieve registry data: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# 3. Full Member Details (Single clean endpoint)
@router.get("/member/{member_number}")
def get_member_full_details(member_number: str):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = """
            SELECT 
                CAST(MEMBER_NUMBER AS VARCHAR(50)) AS MEMBER_NUMBER,
                LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS MEMBER_NAME,
                DIAGNOSIS,
                COALESCE(DIAGNOSIS_TYPE, 'PRIMARY') AS DIAGNOSIS_TYPE,
                COALESCE(LONG_DESCRIPTION, 'No description available') AS LONG_DESCRIPTION,
                CAST(CLAIM_NUMBER AS VARCHAR(50)) AS CLAIM_NUMBER,
                COALESCE(CONVERT(VARCHAR(10), PAID_DATE, 120), 'N/A') AS PAID_DATE,
                COALESCE(CONVERT(VARCHAR(10), SERVICE_DATE, 120), 'N/A') AS SERVICE_DATE,
                COALESCE(CONVERT(VARCHAR(10), SERVICE_END_DATE, 120), 'N/A') AS SERVICE_END_DATE,
                COALESCE(PAID_AMOUNT, '0') AS PAID_AMOUNT,
                COALESCE(PREPAID_AMOUNT, '0') AS PREPAID_AMOUNT,
                CAST(COALESCE(PCP_NUMBER, 'N/A') AS VARCHAR(50)) AS PCP_NUMBER,
                LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) AS PCP_FULL_NAME,
                COALESCE(CAST([V24_Code] AS VARCHAR(50)), 'N/A') AS TARGET_HCC_V24,
                COALESCE(CAST([V28_Code] AS VARCHAR(100)), 'ICD Code removed from V28') AS TARGET_HCC_V28
            FROM dbo.Member_ICDcodes
            WHERE CAST(MEMBER_NUMBER AS VARCHAR(50)) = ?
            ORDER BY PAID_DATE DESC
        """

        cursor.execute(query, (member_number,))
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        if not rows:
            raise HTTPException(status_code=404, detail="No diagnoses found for this member")

        member_name = rows[0]["MEMBER_NAME"] or "Patient Details"

        return {
            "success": True,
            "member_number": member_number,
            "member_name": member_name,
            "total_diagnoses": len(rows),
            "diagnoses": rows
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Database Error in member details:", str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
