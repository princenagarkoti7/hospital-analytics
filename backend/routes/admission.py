import csv
import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from db import get_connection

router = APIRouter(
    prefix="/api/admission",
    tags=["Admission"]
)

# ==========================================
# 1. STATS API
# ==========================================
@router.get("/stats")
def get_admission_stats():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Basic metrics
        cursor.execute("""
            WITH unique_members AS (
                SELECT 
                    HA.*,
                    ROW_NUMBER() OVER (PARTITION BY HA.Member_Number ORDER BY HA.PCP_Number) AS rnk
                FROM dbo._Hospital_Admission HA
            )
            SELECT 
                COUNT(Member_Number) AS number_of_patients,
                COUNT(Model_Admission_Status) AS total_predictions
            FROM unique_members
            WHERE rnk = '1'
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
            error_percentage = round((incorrect_count / total_rows) * 100, 2)
            accuracy_percentage = round(100 - error_percentage, 2)
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
                SUM(CASE WHEN Actual_Admission_Status = 'Admission' THEN 1 ELSE 0 END) AS actual_admissions,
                SUM(CASE WHEN Actual_Admission_Status = 'No Admission' THEN 1 ELSE 0 END) AS actual_no_admissions,
                SUM(CASE WHEN Model_Admission_Status = 'Admission' THEN 1 ELSE 0 END) AS predicted_admissions,
                SUM(CASE WHEN Model_Admission_Status = 'No Admission' THEN 1 ELSE 0 END) AS predicted_no_admissions
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
# Path: /api/admission/patients
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

        where_clause = "WHERE 1=1"
        params = []

        if search.strip():
            where_clause += " AND CAST(HA.Member_Number AS VARCHAR(50)) LIKE ?"
            params.append(f"%{search.strip()}%")

        if condition != "ALL":
            where_clause += " AND HA.Risk_Category = ?"
            params.append(condition)

        if status != "ALL":
            where_clause += " AND HA.Actual_Admission_Status = ?"
            params.append(status)

        unique_patients_cte = f"""
            WITH UniquePatients AS (
                SELECT
                    HA.Member_Number,
                    COALESCE(NAME_LOOKUP.Member_Name, 'N/A') AS Member_Name,
                    HA.Age,
                    HA.Gender,
                    HA.Tier,
                    HA.Risk_Score,
                    HA.Risk_Category,
                    HA.Total_Medical_Cost,
                    HA.Admission_prob_percentage,
                    HA.Model_Admission_Status,
                    HA.Actual_Admission_Status,
                    ROW_NUMBER() OVER (
                        PARTITION BY HA.Member_Number
                        ORDER BY HA.Member_Number
                    ) AS rn
                FROM dbo.Hospital_Admission HA
                OUTER APPLY (
                    SELECT TOP 1 
                        LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS Member_Name
                    FROM dbo.Member_ICDcodes ICD
                    WHERE CAST(ICD.MEMBER_NUMBER AS VARCHAR(50)) = CAST(HA.Member_Number AS VARCHAR(50))
                      AND (ICD.MEMBER_FIRST_NAME IS NOT NULL OR ICD.MEMBER_LAST_NAME IS NOT NULL)
                ) NAME_LOOKUP
                {where_clause}
            )
        """

        count_query = f"""
            {unique_patients_cte}
            SELECT COUNT(*)
            FROM UniquePatients
            WHERE rn = 1
        """
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]

        stats_query = f"""
            {unique_patients_cte}
            SELECT
                COUNT(*) AS total_registrations,
                SUM(CASE WHEN Risk_Category = 'High Risk' THEN 1 ELSE 0 END) AS high_risk_cohorts,
                SUM(CASE WHEN Actual_Admission_Status = 'Admission' THEN 1 ELSE 0 END) AS confirmed_admissions
            FROM UniquePatients
            WHERE rn = 1
        """
        cursor.execute(stats_query, params)
        stats_row = cursor.fetchone()

        total_registrations = stats_row[0] or 0
        high_risk_cohorts = stats_row[1] or 0
        confirmed_admissions = stats_row[2] or 0

        data_query = f"""
            {unique_patients_cte}
            SELECT
                Member_Number,
                Member_Name,
                Risk_Score,
                Age,
                Gender,
                Tier,
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
        data_params = params + [offset, page_size]
        cursor.execute(data_query, data_params)

        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        total_pages = (
            (total_count + page_size - 1) // page_size
            if total_count > 0
            else 0
        )

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
        raise HTTPException(status_code=500, detail="Failed to retrieve patient data")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
# 3. PATIENT PROFILE DETAIL API
# Path: /api/admission/patient/{member_number}
# ==========================================
@router.get("/patient/{member_number}")
def get_patient_profile(member_number: str):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Base Member Row joined with Member_ICDcodes
        patient_query = """
            SELECT TOP 1
                HA.Member_Number,
                COALESCE(NAME_LOOKUP.Member_Name, 'N/A') AS Member_Name,
                HA.Age,
                HA.Gender,
                HA.Tier,
                HA.PCP_Number,
                HA.Group_Number,
                HA.Risk_Score,
                HA.IPA_Claims_Budget,
                HA.Capitation,
                HA.Source_File_Name,
                HA.Total_Medical_Claims,
                HA.Unique_Claims,
                HA.Unique_Diagnosis,
                HA.Unique_Procedures,
                HA.Unique_Providers,
                HA.Total_Medical_Cost,
                HA.Avg_Claim_Cost,
                HA.Max_Claim_Cost,
                HA.Office_Visits,
                HA.Outpatient_Visits,
                HA.ER_Visits,
                HA.Prescription_Count,
                HA.Unique_Drugs,
                HA.Drug_Classes,
                HA.Pharmacy_Cost,
                HA.Avg_Days_Supply,
                HA.Dental_Visits,
                HA.Dental_Cost,
                HA.Admission_prob_percentage,
                HA.Risk_Category,
                HA.Actual_Admission_Status,
                HA.Model_Admission_Status,
                HA.Prediction_Correct,
                HA.Prediction_Result,
                HA.Target,
                HA.target_predicted,
                CAST(HA.Last_PCP_Encountered_Number AS VARCHAR(50)) AS Last_PCP_Encountered_Number,
                HA.Last_PCP_Encountered_Last_Name,
                HA.Last_PCP_Encountered_First_Name,
                COALESCE(CONVERT(VARCHAR(10), HA.Last_PCP_Encounter_Date, 120), 'N/A') AS Last_PCP_Encounter_Date
            FROM dbo.Hospital_Admission HA
            OUTER APPLY (
                SELECT TOP 1 
                    LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS Member_Name
                FROM dbo.Member_ICDcodes ICD
                WHERE CAST(ICD.MEMBER_NUMBER AS VARCHAR(50)) = CAST(HA.Member_Number AS VARCHAR(50))
                  AND (ICD.MEMBER_FIRST_NAME IS NOT NULL OR ICD.MEMBER_LAST_NAME IS NOT NULL)
            ) NAME_LOOKUP
            WHERE CAST(HA.Member_Number AS VARCHAR(50)) = ?
        """

        cursor.execute(patient_query, str(member_number).strip())
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        columns = [column[0] for column in cursor.description]
        patient = dict(zip(columns, row))

        # 2. Diagnoses history (Grouped for unique conditions in Tabs)
        diagnoses = []
        try:
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
                    WHERE CAST(Member_Number AS VARCHAR(50)) = ?
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
            cursor.execute(diagnosis_query, str(member_number).strip())
            diagnosis_columns = [column[0] for column in cursor.description]
            diagnoses = [
                dict(zip(diagnosis_columns, d_row))
                for d_row in cursor.fetchall()
            ]
        except Exception:
            diagnoses = []

        patient["Diagnoses"] = diagnoses

        # 3. Clinical Timeline from dbo.Medical_Claims
        medical_history = []
        try:
            member_param = str(member_number).strip()
            medical_history_query = """
                SELECT 
                    SERVICE_DATE,
                    PLACE_OF_SERVICE,
                    SERVICE_PROVIDER_LAST_NAME,
                    SERVICE_PROVIDER_FIRST_NAME,
                    PROCEDURE_CODE_2,
                    SERVICE_SUB_CATEGORY,
                    PAID_PROVIDER_LAST_NAME
                FROM (
                    SELECT DISTINCT
                        [SERVICE DATE] AS RAW_DATE,
                        COALESCE(CONVERT(VARCHAR(10), [SERVICE DATE], 120), CAST([SERVICE DATE] AS VARCHAR(20))) AS SERVICE_DATE,
                        COALESCE([PLACE OF SERVICE], 'N/A') AS PLACE_OF_SERVICE,
                        COALESCE([SERVICE PROVIDER LAST NAME], '') AS SERVICE_PROVIDER_LAST_NAME,
                        COALESCE([SERVICE PROVIDER FIRST NAME], '') AS SERVICE_PROVIDER_FIRST_NAME,
                        COALESCE([PROCEDURE CODE 2], '') AS PROCEDURE_CODE_2,
                        COALESCE([SERVICE SUB-CATEGORY], 'Medical Claim Encounter') AS SERVICE_SUB_CATEGORY,
                        COALESCE([PAID PROVIDER LAST NAME], '') AS PAID_PROVIDER_LAST_NAME
                    FROM [dbo].[Medical_Claims]
                    WHERE CAST([MEMBER NUMBER] AS VARCHAR(50)) = ?
                ) AS ClaimsSubquery
                ORDER BY RAW_DATE DESC
            """
            cursor.execute(medical_history_query, member_param)
            history_columns = [col[0] for col in cursor.description]
            medical_history = [
                dict(zip(history_columns, h_row))
                for h_row in cursor.fetchall()
            ]
        except Exception as hist_err:
            print("Admission clinical timeline query error:", str(hist_err))
            medical_history = []

        patient["Medical_History"] = medical_history

        # 4. Medication Claims from Fact_pharmacyClaims (Excluding Refills & Pkg Size, including Drug Code & Dosage Strength)
        medications = []
        try:
            medication_query = """
                SELECT
                    CAST([NATIONAL DRUG CODE] AS VARCHAR(50)) AS DRUG_CODE,
                    [DRUG NAME] AS DRUG_NAME,
                    CASE 
                        -- Case 1: Standard layout: Strength has number, Metric Units has text
                        WHEN ISNUMERIC(LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50))))) = 1 
                             AND NULLIF(LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50)))), '') NOT IN ('N/A', 'NULL')
                        THEN LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50)))) + ' ' + LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50))))

                        -- Case 2: Inverted columns: Metric Units has number, Drug Strength has text
                        WHEN ISNUMERIC(LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50))))) = 1 
                             AND NULLIF(LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50)))), '') NOT IN ('N/A', 'NULL')
                        THEN LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50)))) + ' ' + LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50))))

                        -- Case 3: Only Strength is available
                        WHEN NULLIF(LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50)))), '') NOT IN ('N/A', 'NULL')
                             AND LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50)))) <> ''
                        THEN LTRIM(RTRIM(CAST([DRUG STRENGHT] AS VARCHAR(50))))

                        -- Case 4: Strength is NULL/N/A, so fallback to Metric Unit
                        WHEN NULLIF(LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50)))), '') NOT IN ('N/A', 'NULL')
                             AND LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50)))) <> ''
                        THEN LTRIM(RTRIM(CAST([METRICS UNITS] AS VARCHAR(50))))

                        -- Case 5: Both empty/null
                        ELSE ''
                    END AS DOSAGE_STRENGTH,
                    [PRESCRIPTION NUMBER] AS PRESCRIPTION_NUMBER,
                    COALESCE(CONVERT(VARCHAR(10), [PRESCRIPTION FILL DATE], 120), CAST([PRESCRIPTION FILL DATE] AS VARCHAR(20))) AS PRESCRIPTION_FILL_DATE,
                    [DAYS SUPPLY] AS DAYS_SUPPLY,
                    [PRESC PHYSICIAN LAST NAME] AS PRESC_PHYSICIAN_LAST_NAME,
                    [PRESC PHYSICIAN FIRST NAME] AS PRESC_PHYSICIAN_FIRST_NAME
                FROM dbo.Fact_pharmacyClaims
                WHERE CAST([PATIENT NUMBER] AS VARCHAR(50)) = ?
                ORDER BY 
                    [PRESCRIPTION FILL DATE] DESC
            """
            cursor.execute(medication_query, (str(member_number).strip(),))
            med_columns = [column[0] for column in cursor.description]
            medications = [
                dict(zip(med_columns, m_row))
                for m_row in cursor.fetchall()
            ]
        except Exception as med_err:
            print("Medication claims query error:", str(med_err))
            medications = []

        patient["Medications"] = medications

        return {
            "success": True,
            "data": patient
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_patient_profile: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve patient profile: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ==========================================
# 4. EXPORT CSV API
# Path: /api/admission/patients/export
# ==========================================
@router.get("/patients/export")
def export_patients_csv(
    search: str = Query("", description="Search by Member ID"),
    condition: str = Query("ALL", description="Filter by Risk Category"),
    status: str = Query("ALL", description="Filter by Actual Admission Status")
):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        where_clause = "WHERE 1=1"
        params = []

        if search.strip():
            where_clause += " AND CAST(HA.Member_Number AS VARCHAR(50)) LIKE ?"
            params.append(f"%{search.strip()}%")

        if condition != "ALL":
            where_clause += " AND HA.Risk_Category = ?"
            params.append(condition)

        if status != "ALL":
            where_clause += " AND HA.Actual_Admission_Status = ?"
            params.append(status)

        export_query = f"""
            WITH UniquePatients AS (
                SELECT
                    HA.Member_Number,
                    COALESCE(NAME_LOOKUP.Member_Name, 'N/A') AS Member_Name,
                    HA.Risk_Score,
                    HA.Age,
                    HA.Gender,
                    HA.Tier,
                    HA.Risk_Category,
                    HA.Total_Medical_Cost,
                    HA.Admission_prob_percentage,
                    HA.Model_Admission_Status,
                    HA.Actual_Admission_Status,
                    ROW_NUMBER() OVER (
                        PARTITION BY HA.Member_Number
                        ORDER BY HA.Member_Number
                    ) AS rn
                FROM dbo.Hospital_Admission HA
                OUTER APPLY (
                    SELECT TOP 1 
                        LTRIM(RTRIM(COALESCE(MEMBER_FIRST_NAME, '') + ' ' + COALESCE(MEMBER_LAST_NAME, ''))) AS Member_Name
                    FROM dbo.Member_ICDcodes ICD
                    WHERE CAST(ICD.MEMBER_NUMBER AS VARCHAR(50)) = CAST(HA.Member_Number AS VARCHAR(50))
                      AND (ICD.MEMBER_FIRST_NAME IS NOT NULL OR ICD.MEMBER_LAST_NAME IS NOT NULL)
                ) NAME_LOOKUP
                {where_clause}
            )
            SELECT
                Member_Number,
                Member_Name,
                Risk_Score,
                Age,
                Gender,
                Tier,
                Risk_Category,
                Total_Medical_Cost,
                Admission_prob_percentage,
                Model_Admission_Status,
                Actual_Admission_Status
            FROM UniquePatients
            WHERE rn = 1
            ORDER BY Member_Number
        """

        cursor.execute(export_query, params)
        rows = cursor.fetchall()

        headers = [
            "Member Number", "Member Name", "Risk Score", "Age", "Gender",
            "Tier", "Risk Category", "Total Medical Cost", "Admission Prob (%)",
            "Model Admission Status", "Actual Admission Status"
        ]

        def generate_csv_stream():
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            for row in rows:
                writer.writerow(list(row))
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)

        return StreamingResponse(
            generate_csv_stream(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=Patient_Admission_Report.csv"
            }
        )

    except Exception as e:
        print("Database Error during Export:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export patient data: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()