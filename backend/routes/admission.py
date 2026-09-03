from fastapi import APIRouter, HTTPException, Query
from db import get_connection

router = APIRouter(
    prefix="/api/admission",
    tags=["Admission"]
)

@router.get("/stats")
def get_admission_stats():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Basic metrics
        cursor.execute("""
                        with unique_members as 
              (select 
			     HA.*,
                 row_number() over (partition by HA.Member_Number order by HA.PCP_Number) as rnk
               FROM dbo._Hospital_Admission HA
              )
              SELECT 
                COUNT(Member_Number) AS number_of_patients,
                COUNT(Model_Admission_Status) AS total_predictions
              FROM unique_members
               where rnk='1'
        """)

        row = cursor.fetchone()

        number_of_patients = int(row.number_of_patients or 0)
        total_predictions = int(row.total_predictions or 0)

        # 2. Risk categories
        cursor.execute("""
            SELECT
                Risk_Category,
                COUNT(*) AS total
            FROM dbo._Hospital_Admission
            GROUP BY Risk_Category
        """)

        risk_categories = {
            "High Risk": 0,
            "Medium Risk": 0,
            "Low Risk": 0
        }

        for row in cursor.fetchall():
            if row.Risk_Category is not None:
                category = str(row.Risk_Category).strip()
                risk_categories[category] = int(row.total)

        # 3. Prediction accuracy
        cursor.execute("""
            SELECT
                COUNT(*) AS total_rows,
                SUM(
                    CASE
                        WHEN Prediction_Correct = 0 THEN 1
                        ELSE 0
                    END
                ) AS incorrect_count
            FROM dbo._Hospital_Admission
            WHERE Prediction_Correct IS NOT NULL
        """)

        row = cursor.fetchone()

        total_rows = int(row.total_rows or 0)
        incorrect_count = int(row.incorrect_count or 0)

        if total_rows > 0:
            error_percentage = round(
                (incorrect_count / total_rows) * 100,
                2
            )
            accuracy_percentage = round(
                100 - error_percentage,
                2
            )
        else:
            error_percentage = 0.0
            accuracy_percentage = 100.0

        # 4. Prediction results
        cursor.execute("""
            SELECT
                Prediction_Result,
                COUNT(*) AS total
            FROM dbo._Hospital_Admission
            WHERE Prediction_Result IS NOT NULL
            GROUP BY Prediction_Result
        """)

        prediction_results = {}

        for row in cursor.fetchall():
            result = str(row.Prediction_Result).strip()
            prediction_results[result] = int(row.total)

        # 5. Actual vs predicted admissions
        cursor.execute("""
            SELECT
                SUM(
                    CASE
                        WHEN Actual_Admission_Status = 'Admission'
                        THEN 1 ELSE 0
                    END
                ) AS actual_admissions,

                SUM(
                    CASE
                        WHEN Actual_Admission_Status = 'No Admission'
                        THEN 1 ELSE 0
                    END
                ) AS actual_no_admissions,

                SUM(
                    CASE
                        WHEN Model_Admission_Status = 'Admission'
                        THEN 1 ELSE 0
                    END
                ) AS predicted_admissions,

                SUM(
                    CASE
                        WHEN Model_Admission_Status = 'No Admission'
                        THEN 1 ELSE 0
                    END
                ) AS predicted_no_admissions

            FROM dbo._Hospital_Admission
        """)

        row = cursor.fetchone()

        admission_comparison = {
            "actual_admissions": int(row.actual_admissions or 0),
            "actual_no_admissions": int(row.actual_no_admissions or 0),
            "predicted_admissions": int(row.predicted_admissions or 0),
            "predicted_no_admissions": int(row.predicted_no_admissions or 0)
        }

        # 6. Gender distribution
        cursor.execute("""
            SELECT
                Gender,
                COUNT(*) AS total
            FROM dbo._Hospital_Admission
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
            "risk_categories": risk_categories,
            "error_percentage": error_percentage,
            "accuracy_percentage": accuracy_percentage,
            "prediction_results": prediction_results,
            "admission_comparison": admission_comparison,
            "gender_distribution": gender_distribution
        }

    except Exception as e:
        print("Database Error:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve admission statistics: {str(e)}"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()

    # ==========================================
# 2. PATIENT LIST API
# Path: /admission/patients
# Used in: /Admission/PatientList (Frontend)
# ==========================================
@router.get("/patients")
def get_patient_list(
    search: str = Query("", description="Search by Member ID"),
    condition: str = Query("ALL", description="Filter by Risk Category"),
    status: str = Query("ALL", description="Filter by Actual Admission Status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(250, ge=1, le=250)
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        offset = (page - 1) * page_size

        # =========================================================
        # FILTERS
        # =========================================================

        where_clause = "WHERE 1=1"
        params = []

        if search.strip():
            where_clause += """
                AND CAST(Member_Number AS VARCHAR(50)) LIKE ?
            """
            params.append(f"%{search.strip()}%")

        if condition != "ALL":
            where_clause += """
                AND Risk_Category = ?
            """
            params.append(condition)

        if status != "ALL":
            where_clause += """
                AND Actual_Admission_Status = ?
            """
            params.append(status)

        # =========================================================
        # UNIQUE PATIENTS
        # =========================================================

        unique_patients_cte = f"""
            WITH UniquePatients AS (
                SELECT
                    Member_Number,
                    Age,
                    Gender,
                    Tier,
                    Risk_Score,
                    Risk_Category,
                    Total_Medical_Cost,
                    Admission_prob_percentage,
                    Model_Admission_Status,
                    Actual_Admission_Status,

                    ROW_NUMBER() OVER (
                        PARTITION BY Member_Number
                        ORDER BY Member_Number
                    ) AS rn

                FROM dbo.Hospital_Admission

                {where_clause}
            )
        """

        # =========================================================
        # TOTAL FILTERED UNIQUE PATIENTS
        # =========================================================

        count_query = f"""
            {unique_patients_cte}

            SELECT COUNT(*)
            FROM UniquePatients
            WHERE rn = 1
        """

        cursor.execute(count_query, params)

        total_count = cursor.fetchone()[0]

        # =========================================================
        # GLOBAL STATS
        #
        # These are calculated across ALL filtered patients,
        # NOT just the current 250 rows.
        # =========================================================

        stats_query = f"""
            {unique_patients_cte}

            SELECT
                COUNT(*) AS total_registrations,

                SUM(
                    CASE
                        WHEN Risk_Category = 'High Risk'
                        THEN 1
                        ELSE 0
                    END
                ) AS high_risk_cohorts,

                SUM(
                    CASE
                        WHEN Actual_Admission_Status = 'Admission'
                        THEN 1
                        ELSE 0
                    END
                ) AS confirmed_admissions

            FROM UniquePatients
            WHERE rn = 1
        """

        cursor.execute(stats_query, params)

        stats_row = cursor.fetchone()

        total_registrations = stats_row[0] or 0
        high_risk_cohorts = stats_row[1] or 0
        confirmed_admissions = stats_row[2] or 0

        # =========================================================
        # PAGINATED PATIENT DATA
        # =========================================================

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
                Admission_prob_percentage,
                Model_Admission_Status,
                Actual_Admission_Status

            FROM UniquePatients

            WHERE rn = 1

            ORDER BY Member_Number

            OFFSET ? ROWS
            FETCH NEXT ? ROWS ONLY
        """

        data_params = params + [
            offset,
            page_size
        ]

        cursor.execute(
            data_query,
            data_params
        )

        columns = [
            column[0]
            for column in cursor.description
        ]

        results = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

        # =========================================================
        # PAGINATION
        # =========================================================

        total_pages = (
            (total_count + page_size - 1) // page_size
            if total_count > 0
            else 0
        )

        # =========================================================
        # RESPONSE
        # =========================================================

        return {
            "success": True,

            "data": results,

            "stats": {
                "total_registrations": total_registrations,
                "high_risk_cohorts": high_risk_cohorts,
                "confirmed_admissions": confirmed_admissions
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

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve patient data"
        )

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()
# ==========================================
# 3. PATIENT PROFILE DETAIL API
# Path: /admission/patient/{member_id}
# Used in: /Admission/PatientList/PatientProfile (Frontend)
# ==========================================
@router.get("/patient/{member_number}")
def get_patient_profile(member_number: str):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ---------------------------------------------------------
        # 1. Get patient information
        #    All non-diagnosis fields are the same across rows,
        #    so we only need one row.
        # ---------------------------------------------------------
        patient_query = """
            SELECT TOP 1
                Member_Number,
                Age,
                Gender,
                Tier,
                PCP_Number,
                Group_Number,
                Risk_Score,
                IPA_Claims_Budget,
                Capitation,
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
                Admission_prob_percentage,
                Risk_Category,
                Actual_Admission_Status,
                Model_Admission_Status,
                Prediction_Correct,
                Prediction_Result,
                Target,
                target_predicted
            FROM dbo.Hospital_Admission
            WHERE Member_Number = ?
        """

        cursor.execute(patient_query, member_number)

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        columns = [column[0] for column in cursor.description]

        patient = dict(zip(columns, row))

        # ---------------------------------------------------------
        # 2. Get ALL diagnosis rows for this patient
        # ---------------------------------------------------------
        diagnosis_query = """
              WITH Distinct_Member_Diagnosis AS (
                 SELECT DISTINCT
                     DIAGNOSIS,
                     Normalized_DIAGNOSIS,
                     DIAGNOSIS_TYPE,
                     SHORT_DESCRIPTION,
                     LONG_DESCRIPTION,
                     CAST(Year_month AS VARCHAR(10)) AS Year_month
                 FROM dbo.Hospital_Admission
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

        diagnosis_columns = [
            column[0] for column in cursor.description
        ]

        diagnoses = [
            dict(zip(diagnosis_columns, diagnosis_row))
            for diagnosis_row in cursor.fetchall()
        ]

        # ---------------------------------------------------------
        # 3. Add diagnoses to patient response
        # ---------------------------------------------------------
        patient["Diagnoses"] = diagnoses

        return {
            "success": True,
            "data": patient
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Database Error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve patient profile"
        )

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
