"""
ForgeMind AI - FastAPI Application
Domain: Industry 5.0 - Adaptive Production Planning & Disruption Management
Team: NexForge

This module acts strictly as an API orchestration layer:
- Exposes health, machine, and order metadata.
- Orchestrates disruption simulation and recovery plan generation via backend.recovery_engine.
- Manages in-memory activation of approved recovery plans and active production schedule.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure robust import paths whether invoked from workspace root or backend dir
backend_dir = Path(__file__).resolve().parent
workspace_dir = backend_dir.parent
if str(workspace_dir) not in sys.path:
    sys.path.insert(0, str(workspace_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from backend.recovery_engine import generate_recovery_plans, load_simulation_data
except ImportError:
    from recovery_engine import generate_recovery_plans, load_simulation_data

try:
    from backend.ai_service import generate_ai_explanation
except ImportError:
    from ai_service import generate_ai_explanation

app = FastAPI(
    title="ForgeMind AI Backend",
    description="Adaptive Production Planning & Disruption Management API",
    version="0.1.0",
)

# CORS middleware for local frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-Memory State Separation
# ---------------------------------------------------------------------------

# LATEST_RECOVERY_DATA stores only the latest generated candidate recovery plans
# and their business-priority weights.
LATEST_RECOVERY_DATA: Optional[Dict[str, Any]] = None

# ACTIVE_PRODUCTION_STATE stores only the currently manager-approved production schedule.
ACTIVE_PRODUCTION_STATE: Dict[str, Any] = {
    "status": "baseline",
    "approved_plan_id": None,
    "plan_name": None,
    "approved_at": None,
    "plan_details": None,
    "schedule": None,
    "applied_weights": None,
}


# ---------------------------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------------------------

class SimulateDisruptionRequest(BaseModel):
    disruption_id: str = Field(..., description="ID of the disruption to simulate, e.g. 'D001'")


class GenerateRecoveryPlansRequest(BaseModel):
    deadline_weight: float = Field(0.50, description="Weight for deadline adherence (>= 0)")
    cost_weight: float = Field(0.30, description="Weight for cost minimization (>= 0)")
    utilization_weight: float = Field(0.20, description="Weight for machine utilization (>= 0)")


class ApprovePlanRequest(BaseModel):
    plan_id: str = Field(..., description="ID of the plan to approve, e.g. 'PLAN_A', 'PLAN_B', 'PLAN_C'")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["General"])
def read_root() -> Dict[str, str]:
    """Root metadata endpoint."""
    return {
        "project": "ForgeMind AI",
        "team": "NexForge",
        "domain": "Industry 5.0",
        "status": "running",
    }


@app.get("/health", tags=["General"])
def health_check() -> Dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "healthy"}


@app.get("/machines", tags=["Factory Data"])
def get_machines() -> List[Dict[str, Any]]:
    """Load and return all machines from data/machines.json."""
    data = load_simulation_data()
    return data.get("machines", [])


@app.get("/orders", tags=["Factory Data"])
def get_orders() -> List[Dict[str, Any]]:
    """Load and return all orders from data/orders.json."""
    data = load_simulation_data()
    return data.get("orders", [])


@app.post("/simulate-disruption", tags=["Disruption Management"])
def simulate_disruption(payload: SimulateDisruptionRequest) -> Dict[str, Any]:
    """
    Simulate a disruption by ID.
    Validates disruption existence and uses the recovery engine to determine affected orders.
    """
    data = load_simulation_data()
    disruptions = data.get("disruptions", [])

    matched = next((d for d in disruptions if d.get("id") == payload.disruption_id), None)
    if not matched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disruption with ID '{payload.disruption_id}' not found.",
        )

    # Reusable recovery engine determines affected orders
    recovery_result = generate_recovery_plans()

    return {
        "disruption": matched,
        "affected_orders": recovery_result.get("affected_orders", []),
    }


@app.post("/generate-recovery-plans", tags=["Disruption Management"])
def create_recovery_plans(payload: Optional[GenerateRecoveryPlansRequest] = None) -> Dict[str, Any]:
    """
    Generate, evaluate, and dynamically rank the 3 recovery plans.
    Validates business weights and delegates directly to the recovery engine.
    Stores the complete returned candidate result in LATEST_RECOVERY_DATA.
    Does NOT modify ACTIVE_PRODUCTION_STATE.
    """
    global LATEST_RECOVERY_DATA

    if payload is None:
        payload = GenerateRecoveryPlansRequest()

    # Validate non-negative weights
    if (
        payload.deadline_weight < 0.0
        or payload.cost_weight < 0.0
        or payload.utilization_weight < 0.0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business weights must be non-negative numbers.",
        )

    # Validate sum equals 1.0 (with small float tolerance)
    weight_sum = payload.deadline_weight + payload.cost_weight + payload.utilization_weight
    if abs(weight_sum - 1.0) > 1e-4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Business weights must sum to 1.0 (current sum: {weight_sum:.4f}).",
        )

    result = generate_recovery_plans(
        deadline_weight=payload.deadline_weight,
        cost_weight=payload.cost_weight,
        utilization_weight=payload.utilization_weight,
    )

    # Cache latest candidate recommendations without altering active production state
    LATEST_RECOVERY_DATA = result

    return result


@app.post("/approve-plan", tags=["Disruption Management"])
def approve_plan(payload: ApprovePlanRequest) -> Dict[str, Any]:
    """
    Approve a recovery plan for production execution.
    Activates the matching plan directly from LATEST_RECOVERY_DATA.
    Does NOT regenerate recovery plans using default weights.
    Only successful approval modifies ACTIVE_PRODUCTION_STATE.
    """
    global ACTIVE_PRODUCTION_STATE

    if LATEST_RECOVERY_DATA is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recovery plans have been generated yet. Please generate recovery plans before approving.",
        )

    plans = LATEST_RECOVERY_DATA.get("plans", [])
    matching_plan = next((p for p in plans if p.get("plan_id") == payload.plan_id), None)

    if not matching_plan:
        valid_ids = [p.get("plan_id") for p in plans]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan '{payload.plan_id}' not found in the latest generated recovery plans. Available: {', '.join(valid_ids)}.",
        )

    # Activate the matching plan directly into ACTIVE_PRODUCTION_STATE
    ACTIVE_PRODUCTION_STATE["status"] = "active"
    ACTIVE_PRODUCTION_STATE["approved_plan_id"] = matching_plan["plan_id"]
    ACTIVE_PRODUCTION_STATE["plan_name"] = matching_plan["plan_name"]
    ACTIVE_PRODUCTION_STATE["approved_at"] = datetime.now(timezone.utc).isoformat()
    ACTIVE_PRODUCTION_STATE["plan_details"] = matching_plan
    ACTIVE_PRODUCTION_STATE["schedule"] = matching_plan["schedule"]
    ACTIVE_PRODUCTION_STATE["applied_weights"] = LATEST_RECOVERY_DATA.get("weights")

    return {
        "status": "approved",
        "plan_id": payload.plan_id,
        "message": f"Recovery plan {payload.plan_id} approved. Production schedule updated in-memory.",
        "active_schedule": matching_plan["schedule"],
        "plan_details": matching_plan,
    }


@app.get("/production-schedule", tags=["Disruption Management"])
def get_production_schedule() -> Dict[str, Any]:
    """
    Return the complete active production schedule state.
    Initially returns baseline status with approved_plan_id = null.
    After approval returns status = 'active' and the approved plan's schedule and metadata.
    """
    return ACTIVE_PRODUCTION_STATE


@app.post("/explain-recovery", tags=["Disruption Management"])
def explain_recovery() -> Dict[str, Any]:
    """
    Generate an AI explanation and operational reasoning for the latest candidate recovery plans.
    Strictly read-only with respect to ACTIVE_PRODUCTION_STATE and LATEST_RECOVERY_DATA.
    """
    if LATEST_RECOVERY_DATA is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recovery plans have been generated yet. Please generate recovery plans before requesting an AI explanation.",
        )

    # Build explanation strictly from deterministic state
    explanation = generate_ai_explanation(LATEST_RECOVERY_DATA)
    return explanation

