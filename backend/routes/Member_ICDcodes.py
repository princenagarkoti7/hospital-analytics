import csv
import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
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
                 OR MEMBER_LAST_NAME LIKE ?
                 OR LTRIM(RTRIM(COALESCE(SERVICE_PROVIDER_FIRST_NAME, '') + ' ' + COALESCE(SERVICE_PROVIDER_LAST_NAME, ''))) LIKE ?
                 OR PAID_PROVIDER_NAME LIKE ?)
            """)
            s = f"%{search.strip()}%"
            # Updated param list to match all 10 LIKE conditions
            params.extend([s, s, s, s, s, s, s, s, s, s])

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
                LTRIM(RTRIM(COALESCE(SERVICE_PROVIDER_FIRST_NAME, '') + ' ' + COALESCE(SERVICE_PROVIDER_LAST_NAME, ''))) AS SERVICE_PROVIDER_FULL_NAME,
                COALESCE(PAID_PROVIDER_NAME, 'N/A') AS PAID_PROVIDER_NAME,
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

# 4. Export Endpoint for CSV (Fixed Conversion Issue)
@router.get("/export")
def export_icd_registry(
    search: str = Query("", description="Search by Member ID, Diagnosis, Claim, or Description"),
    condition: str = Query("All conditions", description="Unique Long Description filter")
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

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
                 OR MEMBER_LAST_NAME LIKE ?
                 OR LTRIM(RTRIM(COALESCE(SERVICE_PROVIDER_FIRST_NAME, '') + ' ' + COALESCE(SERVICE_PROVIDER_LAST_NAME, ''))) LIKE ?
                 OR PAID_PROVIDER_NAME LIKE ?)
            """)
            s = f"%{search.strip()}%"
            # 10 search parameters for the 10 LIKE conditions
            params.extend([s, s, s, s, s, s, s, s, s, s])

        if condition and condition != "All conditions":
            where_clauses.append("LTRIM(RTRIM(LONG_DESCRIPTION)) = ?")
            params.append(condition.strip())

        where_sql = " AND ".join(where_clauses)

        export_query = f"""
            SELECT 
                CAST(COALESCE(PCP_NUMBER, 'N/A') AS VARCHAR(50)) AS [PCP Number],
                LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) AS [PCP Full Name],
                LTRIM(RTRIM(COALESCE(SERVICE_PROVIDER_FIRST_NAME, '') + ' ' + COALESCE(SERVICE_PROVIDER_LAST_NAME, ''))) AS [Service Provider Name],
                COALESCE(PAID_PROVIDER_NAME, 'N/A') AS [Paid Provider Name],
                COALESCE(CAST([V24_Code] AS VARCHAR(50)), 'N/A') AS [Target HCC V24],
                COALESCE(CAST([V28_Code] AS VARCHAR(100)), 'ICD Code removed from V28') AS [Target HCC V28],
                CAST(MEMBER_NUMBER AS VARCHAR(50)) AS [Member Number],
                LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS [Member Name],
                DIAGNOSIS AS [Diagnosis],
                CAST(CLAIM_NUMBER AS VARCHAR(50)) AS [Claim Number],
                COALESCE(CONVERT(VARCHAR(10), SERVICE_DATE, 120), 'N/A') AS [Service Date],
                COALESCE(CONVERT(VARCHAR(10), SERVICE_END_DATE, 120), 'N/A') AS [Service End Date],
                COALESCE(CONVERT(VARCHAR(10), PAID_DATE, 120), 'N/A') AS [Paid Date],
                COALESCE(CAST(PAID_AMOUNT AS VARCHAR(50)), '0.00') AS [Paid Amount],
                COALESCE(CAST(PREPAID_AMOUNT AS VARCHAR(50)), '0.00') AS [Prepaid Amount],
                COALESCE(CAST(Year_month AS VARCHAR(50)), 'N/A') AS [Year Month],
                COALESCE(LONG_DESCRIPTION, 'No description available') AS [Description]
            FROM dbo.Member_ICDcodes
            WHERE {where_sql}
            ORDER BY MEMBER_NUMBER ASC
        """
        cursor.execute(export_query, params)

        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(columns)
        for row in rows:
            writer.writerow(row)

        output.seek(0)

        headers = {
            "Content-Disposition": "attachment; filename=ICD_Registry_Export.csv"
        }

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers=headers
        )

    except Exception as e:
        print("Export Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
# ==========================================
# 5. HCC DASHBOARD FILTER DROPDOWNS
# ==========================================
@router.get("/dashboard-filters")
def get_hcc_dashboard_filters():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Distinct PCPs
        cursor.execute("""
            SELECT DISTINCT 
                CAST(PCP_NUMBER AS VARCHAR(50)) AS pcp_id,
                LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) AS pcp_name
            FROM dbo.Member_ICDcodes
            WHERE PCP_NUMBER IS NOT NULL 
              AND LTRIM(RTRIM(COALESCE(PCP_FIRST_NAME, '') + ' ' + COALESCE(PCP_LAST_NAME, ''))) <> ''
            ORDER BY pcp_name ASC
        """)
        pcps = [{"id": row[0], "name": row[1]} for row in cursor.fetchall()]

        # Distinct ICD Conditions
        cursor.execute("""
            SELECT DISTINCT 
                DIAGNOSIS,
                COALESCE(LONG_DESCRIPTION, 'No description') AS description
            FROM dbo.Member_ICDcodes
            WHERE DIAGNOSIS IS NOT NULL AND LTRIM(RTRIM(DIAGNOSIS)) <> ''
            ORDER BY DIAGNOSIS ASC
        """)
        conditions = [{"diagnosis": row[0], "description": row[1]} for row in cursor.fetchall()]

        # Distinct V24 HCC Codes with Description
        cursor.execute("""
            SELECT DISTINCT 
                CAST(V24_Code AS VARCHAR(50)) AS v24_code,
                COALESCE(LONG_DESCRIPTION, 'N/A') AS description
            FROM dbo.Member_ICDcodes
            WHERE V24_Code IS NOT NULL 
              AND LTRIM(RTRIM(CAST(V24_Code AS VARCHAR(50)))) NOT IN ('', 'NULL', 'N/A')
            ORDER BY v24_code ASC
        """)
        hcc_codes = [{"code": row[0], "description": row[1]} for row in cursor.fetchall()]

        return {
            "success": True,
            "pcps": pcps,
            "conditions": conditions,
            "hcc_codes": hcc_codes
        }
    except Exception as e:
        print("Filter dropdown error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard filters")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# ==========================================
# 6. HCC DASHBOARD KPIS & STATS
# ==========================================
@router.get("/dashboard-stats")
def get_hcc_dashboard_stats(
    pcp: str = Query("ALL", description="Filter by PCP Number"),
    condition: str = Query("ALL", description="Filter by Diagnosis Code"),
    hcc: str = Query("ALL", description="Filter by V24 HCC Code")
):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        where_clauses = ["DIAGNOSIS IS NOT NULL"]
        params = []

        if pcp != "ALL":
            where_clauses.append("CAST(PCP_NUMBER AS VARCHAR(50)) = ?")
            params.append(pcp.strip())

        if condition != "ALL":
            where_clauses.append("DIAGNOSIS = ?")
            params.append(condition.strip())

        if hcc != "ALL":
            where_clauses.append("CAST(V24_Code AS VARCHAR(50)) = ?")
            params.append(hcc.strip())

        where_sql = " AND ".join(where_clauses)

        stats_query = f"""
            SELECT
                -- 1. Total # of ICD 10 codes across all members and time
                COUNT(DIAGNOSIS) AS total_icd_codes,

                -- Unique count of distinct ICD 10 codes
                COUNT(DISTINCT DIAGNOSIS) AS unique_icd_codes,

                -- Total members impacted
                COUNT(DISTINCT MEMBER_NUMBER) AS total_unique_members,

                -- 2. Unsupported in v28 (Coded under v24 but not supported in v28)
                SUM(
                    CASE 
                        WHEN (V24_Code IS NOT NULL AND LTRIM(RTRIM(CAST(V24_Code AS VARCHAR(50)))) NOT IN ('', 'NULL', 'N/A'))
                             AND (
                                 Is_ICD_Supported_in_v28 = 'No' 
                                 OR V28_Code IS NULL 
                                 OR LTRIM(RTRIM(CAST(V28_Code AS VARCHAR(50)))) IN ('', 'NULL', 'N/A')
                             )
                        THEN 1 
                        ELSE 0 
                    END
                ) AS unsupported_v28_codes,

                -- Total v24 mapped codes
                SUM(
                    CASE 
                        WHEN V24_Code IS NOT NULL AND LTRIM(RTRIM(CAST(V24_Code AS VARCHAR(50)))) NOT IN ('', 'NULL', 'N/A')
                        THEN 1 
                        ELSE 0 
                    END
                ) AS total_v24_supported_codes
            FROM dbo.Member_ICDcodes
            WHERE {where_sql}
        """

        cursor.execute(stats_query, params)
        row = cursor.fetchone()

        total_icd = int(row[0] or 0)
        unique_icd = int(row[1] or 0)
        unique_members = int(row[2] or 0)
        unsupported_v28 = int(row[3] or 0)
        total_v24 = int(row[4] or 0)

        # 3. %age of codes not supported in v28
        if total_icd > 0:
            unsupported_percentage = round((unsupported_v28 / total_icd) * 100, 2)
        else:
            unsupported_percentage = 0.0

        # Most impacted v24 HCCs
        breakdown_query = f"""
            SELECT TOP 10
                COALESCE(CAST(V24_Code AS VARCHAR(50)), 'Unmapped') AS hcc_code,
                COALESCE(MAX(LONG_DESCRIPTION), 'N/A') AS hcc_desc,
                COUNT(*) AS total_occurrences,
                SUM(
                    CASE 
                        WHEN Is_ICD_Supported_in_v28 = 'No' 
                             OR V28_Code IS NULL 
                             OR LTRIM(RTRIM(CAST(V28_Code AS VARCHAR(50)))) IN ('', 'NULL', 'N/A')
                        THEN 1 
                        ELSE 0 
                    END
                ) AS unsupported_in_v28
            FROM dbo.Member_ICDcodes
            WHERE {where_sql}
              AND V24_Code IS NOT NULL 
              AND LTRIM(RTRIM(CAST(V24_Code AS VARCHAR(50)))) NOT IN ('', 'NULL', 'N/A')
            GROUP BY V24_Code
            ORDER BY unsupported_in_v28 DESC, total_occurrences DESC
        """
        cursor.execute(breakdown_query, params)
        hcc_breakdown = [
            {
                "hcc_code": b[0],
                "description": b[1],
                "total_claims": int(b[2] or 0),
                "unsupported_v28": int(b[3] or 0)
            }
            for b in cursor.fetchall()
        ]

        return {
            "success": True,
            "kpis": {
                "total_icd_codes": total_icd,
                "unique_icd_codes": unique_icd,
                "total_unique_members": unique_members,
                "unsupported_v28_codes": unsupported_v28,
                "total_v24_supported_codes": total_v24,
                "unsupported_percentage": unsupported_percentage
            },
            "impacted_hccs": hcc_breakdown
        }
    except Exception as e:
        print("Dashboard stats error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()