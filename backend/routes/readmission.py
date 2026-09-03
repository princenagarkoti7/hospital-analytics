from fastapi import APIRouter, HTTPException, Query
from db import get_connection

router = APIRouter(
    prefix="/api/readmission",
    tags=["Readmission"]
)

# ==========================================
# 1. READMISSION STATS API
# ==========================================
@router.get("/stats")
def get_readmission_stats():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Basic metrics (Unique patients & total predictions)
        cursor.execute("""
            WITH unique_members AS (
                SELECT 
                    HA.*,
                    ROW_NUMBER() OVER (PARTITION BY HA.Member_Number ORDER BY HA.PCP_Number) AS rnk
                FROM dbo._Hospital_Readmission HA
            )
            SELECT 
                COUNT(Member_Number) AS number_of_patients,
                COUNT(Stage1_Readmission_Status) AS total_predictions
            FROM unique_members
            WHERE rnk = 1
        """)

        row = cursor.fetchone()
        number_of_patients = int(row.number_of_patients or 0)
        total_predictions = int(row.total_predictions or 0)

        # 2. Prediction accuracy
        cursor.execute("""
            SELECT
                COUNT(*) AS total_rows,
                SUM(cast(Cascade_Prediction_Correct as int)) AS correct_count
            FROM dbo._Hospital_Readmission
            WHERE Cascade_Prediction_Correct IS NOT NULL
        """)

        row = cursor.fetchone()
        total_rows = int(row.total_rows or 0)
        correct_count = int(row.correct_count or 0)

        if total_rows > 0:
            accuracy_percentage = round((correct_count / total_rows) * 100, 2)
            error_percentage = round(100.0 - accuracy_percentage, 2)
        else:
            accuracy_percentage = 100.0
            error_percentage = 0.0

        # 3. Stage 1 - Prediction Result Distribution
        cursor.execute("""
            SELECT
                Stage1_Prediction_Result,
                COUNT(*) AS total
            FROM dbo._Hospital_Readmission
            WHERE Stage1_Prediction_Result IS NOT NULL
            GROUP BY Stage1_Prediction_Result
        """)

        prediction_results = {
            "True Negative": 0,
            "True Positive": 0,
            "False Positive": 0,
            "False Negative": 0
        }
        for row in cursor.fetchall():
            if row.Stage1_Prediction_Result:
                result_key = str(row.Stage1_Prediction_Result).strip()
                prediction_results[result_key] = int(row.total)

        # 4. Predicted Readmission Time Window
        cursor.execute("""
            SELECT
                Stage2_Predicted_Time_Window,
                COUNT(*) AS total
            FROM dbo._Hospital_Readmission
            WHERE Stage2_Predicted_Time_Window IS NOT NULL
            GROUP BY Stage2_Predicted_Time_Window
            ORDER BY COUNT(*) DESC
        """)

        time_window_distribution = {}
        for row in cursor.fetchall():
            window_name = str(row.Stage2_Predicted_Time_Window).strip()
            time_window_distribution[window_name] = int(row.total)

        # 5. Actual vs Predicted Readmissions
        cursor.execute("""
            SELECT
                SUM(CASE WHEN LOWER(Actual_Readmission_Status) LIKE '%no%' THEN 0 ELSE 1 END) AS actual_readmissions,
                SUM(CASE WHEN LOWER(Actual_Readmission_Status) LIKE '%no%' THEN 1 ELSE 0 END) AS actual_no_readmissions,
                SUM(CASE WHEN LOWER(Stage1_Readmission_Status) LIKE '%no%' THEN 0 ELSE 1 END) AS predicted_readmissions,
                SUM(CASE WHEN LOWER(Stage1_Readmission_Status) LIKE '%no%' THEN 1 ELSE 0 END) AS predicted_no_readmissions
            FROM dbo._Hospital_Readmission
            WHERE Actual_Readmission_Status IS NOT NULL
        """)

        row = cursor.fetchone()
        readmission_comparison = {
            "actual_readmissions": int(row.actual_readmissions or 0),
            "actual_no_readmissions": int(row.actual_no_readmissions or 0),
            "predicted_readmissions": int(row.predicted_readmissions or 0),
            "predicted_no_readmissions": int(row.predicted_no_readmissions or 0)
        }

        # 6. Gender distribution
        cursor.execute("""
            SELECT
                Gender,
                COUNT(*) AS total
            FROM dbo._Hospital_Readmission
            WHERE Gender IS NOT NULL
            GROUP BY Gender
        """)

        gender_distribution = {}
        for row in cursor.fetchall():
            gender = str(row.Gender).strip()
            gender_distribution[gender] = int(row.total)

        return {
            "status": "success",
            "number_of_patients": number_of_patients,
            "total_predictions": total_predictions,
            "error_percentage": error_percentage,
            "accuracy_percentage": accuracy_percentage,
            "prediction_results": prediction_results,
            "time_window_distribution": time_window_distribution,
            "readmission_comparison": readmission_comparison,
            "gender_distribution": gender_distribution
        }

    except Exception as e:
        print("Database Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve readmission statistics: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
# 2. READMISSION PATIENT LIST API
# Path: /api/readmission/patients
# ==========================================
@router.get("/patients")
def get_readmission_patient_list(
    search: str = Query("", description="Search by Member ID"),
    condition: str = Query("ALL", description="Filter by Risk Category (High/Medium/Low Risk)"),
    status: str = Query("ALL", description="Filter by Actual Readmission Status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(250, ge=1, le=250)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        offset = (page - 1) * page_size

        where_clauses = ["1=1"]
        params = []

        if search.strip():
            where_clauses.append("CAST(Member_Number AS VARCHAR(50)) LIKE ?")
            params.append(f"%{search.strip()}%")

        if condition != "ALL":
            where_clauses.append("""
                (CASE 
                    WHEN Risk_Score >= 7.0 THEN 'High Risk'
                    WHEN Risk_Score >= 4.0 THEN 'Medium Risk'
                    ELSE 'Low Risk'
                END) = ?
            """)
            params.append(condition)

        if status != "ALL":
            where_clauses.append("Actual_Readmission_Status = ?")
            params.append(status)

        where_sql = " AND ".join(where_clauses)

        unique_patients_cte = f"""
            WITH UniquePatients AS (
                SELECT
                    Member_Number,
                    Age,
                    Gender,
                    Tier,
                    Risk_Score,
                    CASE 
                        WHEN Risk_Score >= 7.0 THEN 'High Risk'
                        WHEN Risk_Score >= 4.0 THEN 'Medium Risk'
                        ELSE 'Low Risk'
                    END AS Risk_Category,
                    Total_Medical_Cost,
                    Stage1_Admission_Prob_Pct,
                    Stage1_Readmission_Status,
                    Actual_Readmission_Status,
                    Stage2_Predicted_Time_Window,
                    ROW_NUMBER() OVER (
                        PARTITION BY Member_Number
                        ORDER BY PCP_Number
                    ) AS rn
                FROM dbo.Hospital_Readmission
                WHERE {where_sql}
            )
        """

        # Filtered Total Count
        cursor.execute(f"{unique_patients_cte} SELECT COUNT(*) FROM UniquePatients WHERE rn = 1", params)
        total_count = cursor.fetchone()[0]

        # Aggregate Cohort Stats
        stats_query = f"""
            {unique_patients_cte}
            SELECT
                COUNT(*) AS total_registrations,
                SUM(CASE WHEN Risk_Category = 'High Risk' THEN 1 ELSE 0 END) AS high_risk_cohorts,
                SUM(CASE WHEN Actual_Readmission_Status = 'Readmission' THEN 1 ELSE 0 END) AS confirmed_readmissions
            FROM UniquePatients
            WHERE rn = 1
        """
        cursor.execute(stats_query, params)
        stats_row = cursor.fetchone()

        total_registrations = stats_row[0] or 0
        high_risk_cohorts = stats_row[1] or 0
        confirmed_readmissions = stats_row[2] or 0

        # Paginated Rows
        data_query = f"""
            {unique_patients_cte}
            SELECT
                Member_Number,
                Age,
                Gender,
                Tier,
                Risk_Score,
                Risk_Category,
                Total_Medical_Cost,
                Stage1_Admission_Prob_Pct,
                Stage1_Readmission_Status,
                Actual_Readmission_Status,
                Stage2_Predicted_Time_Window
            FROM UniquePatients
            WHERE rn = 1
            ORDER BY Member_Number
            OFFSET ? ROWS
            FETCH NEXT ? ROWS ONLY
        """
        data_params = params + [offset, page_size]
        cursor.execute(data_query, data_params)

        columns = [col[0] for col in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0

        return {
            "success": True,
            "data": results,
            "stats": {
                "total_registrations": total_registrations,
                "high_risk_cohorts": high_risk_cohorts,
                "confirmed_readmissions": confirmed_readmissions
            },
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
        raise HTTPException(status_code=500, detail="Failed to retrieve patient data")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
# 3. READMISSION PATIENT PROFILE DETAIL API
# Path: /api/readmission/patient/{member_number}
# ==========================================
@router.get("/patient/{member_number}")
def get_readmission_patient_profile(member_number: str):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Base Member Row
        patient_query = """
            SELECT TOP 1
                Member_Number,
                Age,
                Gender,
                Tier,
                PCP_Number,
                Group_Number,
                Days_Active,
                Risk_Score,
                CASE 
                    WHEN Risk_Score >= 7.0 THEN 'High Risk'
                    WHEN Risk_Score >= 4.0 THEN 'Medium Risk'
                    ELSE 'Low Risk'
                END AS Risk_Category,
                IPA_Claims_Budget,
                Capitation,
                Effective_Date,
                Expiration_Date,
                Source_File_Name,
                Total_Medical_Claims,
                Unique_Claims,
                Unique_Diagnosis,
                Unique_Procedures,
                Unique_Providers,
                Total_Medical_Cost,
                Avg_Claim_Cost,
                Max_Claim_Cost,
                Office_Visits,
                Outpatient_Visits,
                ER_Visits,
                Prescription_Count,
                Unique_Drugs,
                Drug_Classes,
                Pharmacy_Cost,
                Avg_Days_Supply,
                Dental_Visits,
                Dental_Cost,
                Target_30days,
                Target_30_to_60days,
                Target_60_to_90days,
                Target_90_to_180days,
                Target_Rest_Over180days,
                Stage1_Admission_Prob_Pct,
                Stage1_Readmission_Pred,
                Stage1_Readmission_Status,
                Stage1_Prediction_Result,
                Stage2_Predicted_Time_Window,
                Cascade_Prediction_Correct,
                Actual_Readmission_Status,
                Actual_Target_Bucket
            FROM dbo.Hospital_Readmission
            WHERE Member_Number = ?
        """

        cursor.execute(patient_query, member_number)
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Patient not found")

        columns = [column[0] for column in cursor.description]
        patient = dict(zip(columns, row))

        # 2. Member Diagnoses Rows
        diagnosis_query = """
              WITH Distinct_Member_Diagnosis AS (
                 SELECT DISTINCT
                     DIAGNOSIS,
                     Normalized_DIAGNOSIS,
                     DIAGNOSIS_TYPE,
                     SHORT_DESCRIPTION,
                     LONG_DESCRIPTION,
                     CAST(Year_month AS VARCHAR(10)) AS Year_month
                 FROM dbo.Hospital_Readmission
                 WHERE Member_Number = ?
             )
             SELECT
                 DIAGNOSIS,
                 Normalized_DIAGNOSIS,
                 MAX(DIAGNOSIS_TYPE) AS DIAGNOSIS_TYPE,
                 MAX(SHORT_DESCRIPTION) AS SHORT_DESCRIPTION,
                 MAX(LONG_DESCRIPTION) AS LONG_DESCRIPTION,
                 COUNT(Year_month) AS Total_Visits,
                 MAX(Year_month) AS Last_Visit,
                 STRING_AGG(Year_month, ' | ') WITHIN GROUP (ORDER BY Year_month DESC) AS Visit_History
             FROM Distinct_Member_Diagnosis
             GROUP BY 
                 DIAGNOSIS, 
                 Normalized_DIAGNOSIS
             ORDER BY 
                 Last_Visit DESC
        """

        cursor.execute(diagnosis_query, member_number)
        diagnosis_columns = [col[0] for col in cursor.description]
        diagnoses = [dict(zip(diagnosis_columns, d_row)) for d_row in cursor.fetchall()]

        patient["Diagnoses"] = diagnoses

        return {
            "success": True,
            "data": patient
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Database Error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve patient profile")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
