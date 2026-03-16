# backend/app/routes/reports.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from app.database import get_db
from app.dependencies.roles import require_role
from app.services.logging_service import log_event
import io

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard", dependencies=[Depends(require_role(["ADMIN"]))])
async def dashboard_summary(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    High-level admin dashboard summary:
     - total farmers
     - total operators
     - active users
     - farmers registered this month
    """
    await log_event(
        level="INFO",
        module="reports",
        action="dashboard_summary",
        endpoint="/api/reports/dashboard",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    total_farmers = await db.farmers.count_documents({})
    total_operators = await db.operators.count_documents({})
    total_users = await db.users.count_documents({})

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    farmers_this_month = await db.farmers.count_documents({"created_at": {"$gte": month_start}})

    return {
        "timestamp": datetime.utcnow(),
        "metrics": {
            "farmers_total": total_farmers,
            "operators_total": total_operators,
            "users_total": total_users,
            "farmers_registered_this_month": farmers_this_month,
        }
    }


@router.get("/farmers-by-region", dependencies=[Depends(require_role(["ADMIN"]))])
async def farmers_by_region(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    Aggregate farmer counts by province/district for admin geographic analytics.
    """
    await log_event(
        level="INFO",
        module="reports",
        action="farmers_by_region",
        endpoint="/api/reports/farmers-by-region",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    pipeline = [
        {
            "$group": {
                "_id": {
                    "province": "$address.province_name",
                    "district": "$address.district_name",
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.province": 1, "_id.district": 1}},
    ]
    results = await db.farmers.aggregate(pipeline).to_list(length=None)
    formatted = [
        {
            "province": r["_id"]["province"],
            "district": r["_id"]["district"],
            "farmer_count": r["count"],
        }
        for r in results
    ]
    return {"generated_at": datetime.utcnow(), "regions": formatted}


@router.get("/operator-performance", dependencies=[Depends(require_role(["ADMIN"]))])
async def operator_performance(db=Depends(get_db), current_user: dict = Depends(require_role(["ADMIN"]))):
    """
    Aggregate stats per operator: total farmers registered, recent registrations (30d).
    """
    await log_event(
        level="INFO",
        module="reports",
        action="operator_performance",
        endpoint="/api/reports/operator-performance",
        user_id=current_user.get("email"),
        role="ADMIN",
    )
    cutoff = datetime.utcnow() - timedelta(days=30)
    pipeline = [
        {
            "$group": {
                "_id": "$created_by",
                "total_farmers": {"$sum": 1},
                "recent_farmers": {
                    "$sum": {
                        "$cond": [
                            {"$gte": ["$created_at", cutoff]},
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"total_farmers": -1}},
    ]
    results = await db.farmers.aggregate(pipeline).to_list(length=None)

    out = []
    for r in results:
        # created_by stores the email, so look up operator by email
        op = await db.operators.find_one({"email": r["_id"]}, {"full_name": 1, "email": 1, "operator_id": 1})
        
        # If not found in operators, check if it's an admin user
        if not op:
            user = await db.users.find_one({"email": r["_id"]}, {"full_name": 1, "email": 1})
            if user:
                op = {"full_name": user.get("full_name", "Admin User"), "email": user.get("email")}
        
        out.append(
            {
                "operator_id": r["_id"],
                "operator_name": op.get("full_name") if op else r["_id"],  # Use email if name not found
                "email": op.get("email") if op else r["_id"],
                "total_farmers": r["total_farmers"],
                "recent_farmers_30d": r["recent_farmers"],
            }
        )
    return {"generated_at": datetime.utcnow(), "operators": out}


@router.get("/activity-trends", dependencies=[Depends(require_role(["ADMIN"]))])
async def activity_trends(db=Depends(get_db)):
    """
    Daily registration count for past 14 days for charting.
    """
    days = 14
    start = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"},
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]
    results = await db.farmers.aggregate(pipeline).to_list(length=None)
    formatted = [
        {
            "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
            "registrations": r["count"],
        }
        for r in results
    ]
    return {"generated_at": datetime.utcnow(), "trends": formatted}


@router.get("/farmers-details", dependencies=[Depends(require_role(["ADMIN"]))])
async def farmers_details_report(db=Depends(get_db)):
    """
    Complete farmer details report with all personal and farm information.
    """
    farmers = await db.farmers.find({}, {
        "farmer_id": 1,
        "personal_info": 1,
        "address": 1,
        "farm_info": 1,
        "registration_status": 1,
        "created_by": 1,
        "created_at": 1,
        "_id": 0
    }).sort("created_at", -1).to_list(length=None)
    
    # Format the data for better readability
    formatted_farmers = []
    for farmer in farmers:
        personal_info = farmer.get("personal_info") or {}
        address = farmer.get("address") or {}
        farm_info = farmer.get("farm_info") or {}
        
        # Get crops list
        crops_list = farm_info.get("crops_grown", [])
        if not crops_list:
            crops_list = []
        
        # Format names
        first_name = personal_info.get("first_name", "")
        last_name = personal_info.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip()
        
        formatted_farmers.append({
            "farmer_id": farmer.get("farmer_id", ""),
            "full_name": full_name if full_name else "N/A",
            "nrc_number": personal_info.get("nrc", ""),
            "phone_primary": personal_info.get("phone_primary", ""),
            "phone_secondary": personal_info.get("phone_secondary", ""),
            "gender": personal_info.get("gender", ""),
            "date_of_birth": personal_info.get("date_of_birth", ""),
            "province": address.get("province_name", ""),
            "district": address.get("district_name", ""),
            "constituency": address.get("constituency_name", ""),
            "ward": address.get("ward_name", ""),
            "village": address.get("village", ""),
            "total_land_size": farm_info.get("farm_size_hectares", 0),
            "crops": ", ".join(crops_list) if crops_list else "None",
            "years_farming": farm_info.get("years_farming", 0),
            "registration_status": farmer.get("registration_status", ""),
            "registered_by": farmer.get("created_by", ""),
            "registration_date": farmer.get("created_at", "").strftime("%Y-%m-%d") if farmer.get("created_at") else "",
        })
    
    return {
        "generated_at": datetime.utcnow(),
        "total_farmers": len(formatted_farmers),
        "farmers": formatted_farmers
    }


# ── PDF/Excel download endpoints (Celery-backed) ─────────────────────────────

@router.post("/farmer-pdf/{farmer_id}", dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))])
async def trigger_farmer_pdf(farmer_id: str, current_user: dict = Depends(require_role(["ADMIN", "OPERATOR"]))):
    """Enqueue farmer profile PDF generation. Returns task_id for polling."""
    from app.tasks.report_tasks import generate_farmer_pdf
    task = generate_farmer_pdf.delay(farmer_id)
    await log_event(level="INFO", module="reports", action="trigger_farmer_pdf",
                    endpoint=f"/api/reports/farmer-pdf/{farmer_id}",
                    user_id=current_user.get("email"), role=current_user.get("role"))
    return {"task_id": task.id, "status": "queued",
            "message": "PDF generation started. Poll /reports/task/{task_id} for status."}


@router.post("/operator-pdf/{operator_id}", dependencies=[Depends(require_role(["ADMIN"]))])
async def trigger_operator_pdf(operator_id: str, current_user: dict = Depends(require_role(["ADMIN"]))):
    """Enqueue operator report PDF generation."""
    from app.tasks.report_tasks import generate_operator_pdf
    task = generate_operator_pdf.delay(operator_id)
    await log_event(level="INFO", module="reports", action="trigger_operator_pdf",
                    endpoint=f"/api/reports/operator-pdf/{operator_id}",
                    user_id=current_user.get("email"), role="ADMIN")
    return {"task_id": task.id, "status": "queued",
            "message": "PDF generation started. Poll /reports/task/{task_id} for status."}


@router.post("/summary-pdf", dependencies=[Depends(require_role(["ADMIN"]))])
async def trigger_summary_pdf(current_user: dict = Depends(require_role(["ADMIN"]))):
    """Enqueue admin summary PDF generation."""
    from app.tasks.report_tasks import generate_summary_pdf
    task = generate_summary_pdf.delay()
    await log_event(level="INFO", module="reports", action="trigger_summary_pdf",
                    endpoint="/api/reports/summary-pdf",
                    user_id=current_user.get("email"), role="ADMIN")
    return {"task_id": task.id, "status": "queued",
            "message": "PDF generation started. Poll /reports/task/{task_id} for status."}


@router.post("/farmers-excel", dependencies=[Depends(require_role(["ADMIN"]))])
async def trigger_farmers_excel(province: str = None, current_user: dict = Depends(require_role(["ADMIN"]))):
    """Enqueue farmers Excel export. Optionally filter by province."""
    from app.tasks.report_tasks import generate_farmers_excel
    task = generate_farmers_excel.delay(province)
    await log_event(level="INFO", module="reports", action="trigger_farmers_excel",
                    endpoint="/api/reports/farmers-excel",
                    user_id=current_user.get("email"), role="ADMIN")
    return {"task_id": task.id, "status": "queued",
            "message": "Excel export started. Poll /reports/task/{task_id} for status."}


@router.post("/summary-excel", dependencies=[Depends(require_role(["ADMIN"]))])
async def trigger_summary_excel(current_user: dict = Depends(require_role(["ADMIN"]))):
    """Enqueue admin summary Excel export."""
    from app.tasks.report_tasks import generate_summary_excel
    task = generate_summary_excel.delay()
    await log_event(level="INFO", module="reports", action="trigger_summary_excel",
                    endpoint="/api/reports/summary-excel",
                    user_id=current_user.get("email"), role="ADMIN")
    return {"task_id": task.id, "status": "queued",
            "message": "Excel export started. Poll /reports/task/{task_id} for status."}


@router.get("/task/{task_id}", dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))])
async def poll_report_task(task_id: str):
    """Poll Celery task status. Returns file_id when complete."""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    result = AsyncResult(task_id, app=celery_app)
    if result.state == "PENDING":
        return {"task_id": task_id, "status": "pending"}
    elif result.state == "STARTED":
        return {"task_id": task_id, "status": "processing"}
    elif result.state == "SUCCESS":
        return {"task_id": task_id, "status": "completed", **result.result}
    elif result.state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "error": str(result.result)}
    return {"task_id": task_id, "status": result.state.lower()}


@router.get("/task/{task_id}/status", dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))])
async def poll_report_task_status(task_id: str):
    """Alias: poll Celery task status at /task/{task_id}/status path."""
    return await poll_report_task(task_id)


@router.get("/download/{file_id}", dependencies=[Depends(require_role(["ADMIN", "OPERATOR"]))])
async def download_report(file_id: str):
    """Stream a completed report file from GridFS by file_id."""
    from app.services.gridfs_service import gridfs_service
    try:
        file_data, metadata = await gridfs_service.download_file(file_id)
        filename    = metadata.get("filename", "report")
        content_type = metadata.get("content_type", "application/octet-stream")
        if filename.endswith(".pdf"):
            content_type = "application/pdf"
        elif filename.endswith(".xlsx"):
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Report file not found: {str(e)}")
