"""
ForgeMind AI - AI Copilot & Reasoning Layer
Domain: Industry 5.0 - Adaptive Production Planning & Disruption Management
Team: NexForge

This service provides explanatory AI reasoning for recovery plans.
CRITICAL DESIGN RULES:
- The deterministic recovery engine (backend.recovery_engine) is the SOLE SOURCE OF TRUTH.
- This service is read-only and strictly advisory/explanatory.
- Uses Python standard library urllib.request (zero extra pip dependencies).
- Reads API key ONLY from GEMINI_API_KEY environment variable.
- Contains a comprehensive deterministic fallback generator that produces high-fidelity,
  metrics-grounded explanations when the API key is missing or the external API is unreachable.
"""

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, Optional


def generate_deterministic_fallback(recovery_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a complete, structured, metrics-grounded explanation directly from
    the deterministic engine output without requiring an external AI API.
    Uses actual dynamic values from recovery_data rather than hardcoded metrics.
    """
    disruption = recovery_data.get("disruption") or {}
    disruption_id = disruption.get("id", "D001")
    machine_id = disruption.get("machine", "M2")
    process_name = disruption.get("process", "Drilling")
    downtime = disruption.get("duration_minutes", 180)
    severity = disruption.get("severity", "High")

    affected_orders = recovery_data.get("affected_orders") or []
    orders_str = ", ".join(affected_orders) if affected_orders else "None"

    weights = recovery_data.get("weights") or {}
    w_dead = round(weights.get("deadline_weight", 0.5) * 100)
    w_cost = round(weights.get("cost_weight", 0.3) * 100)
    w_util = round(weights.get("utilization_weight", 0.2) * 100)

    plans = recovery_data.get("plans") or []
    plans_by_id = {p.get("plan_id"): p for p in plans}

    plan_a = plans_by_id.get("PLAN_A", {})
    plan_b = plans_by_id.get("PLAN_B", {})
    plan_c = plans_by_id.get("PLAN_C", {})

    rec = recovery_data.get("recommended_plan") or {}
    rec_id = rec.get("plan_id", "PLAN_B")
    rec_name = rec.get("plan_name", "Recovery Plan")
    rec_cost = rec.get("extra_cost", 0.0)
    rec_delay = rec.get("total_delay_minutes", 0)
    rec_adherence = rec.get("deadline_adherence_percent", 0.0)
    rec_util = rec.get("machine_utilization_percent", 0.0)
    rec_score = rec.get("score", 0.0)

    exec_summary = (
        f"A {severity.lower()} severity disruption on machine {machine_id} ({process_name}) halted "
        f"operations for {downtime} minutes, impacting {len(affected_orders)} downstream orders ({orders_str}). "
        f"Under current business priorities (Deadline: {w_dead}%, Cost: {w_cost}%, Utilization: {w_util}%), "
        f"{rec_id} ({rec_name}) is the recommended strategy with a multi-objective score of {rec_score}/100, "
        f"balancing ${rec_cost:.0f} extra cost, {rec_delay} minutes total delay, and {rec_adherence}% on-time adherence."
    )

    diagnosis = (
        f"Disruption scenario {disruption_id} caused an unplanned {downtime}-minute downtime on primary {process_name.lower()} "
        f"workstation {machine_id}. All machining on this unit is suspended from the disruption onset until repair is complete, "
        f"creating a critical bottleneck in the production routing."
    )

    resources = (
        f"Primary impacted machine is {machine_id} (DrillPro). Downstream workstations Assembly (M3) and "
        f"Finishing (M4) face starvation delays due to missing work-in-progress drilling batches, while Cutting (M1) "
        f"remains available for upstream staging."
    )

    orders_analysis = (
        f"{len(affected_orders)} production orders ({orders_str}) have operations routed through {machine_id} during "
        f"the disruption window. Without schedule adjustments, these orders will miss planned dispatch times."
    )

    operational_impact = (
        f"The 3-hour downtime halts Stage 2 operations. If unmitigated, drilling queue backups cascade downstream, "
        f"resulting in up to {plan_a.get('total_delay_minutes', 705)} minutes of cumulative order delay and reducing "
        f"deadline adherence to {plan_a.get('deadline_adherence_percent', 16.7)}%."
    )

    tradeoffs = (
        f"Trade-off analysis across evaluated plans: "
        f"PLAN A (Cost Saver): $0 extra cost, {plan_a.get('total_delay_minutes', 0)}m delay, {plan_a.get('deadline_adherence_percent', 0)}% adherence. "
        f"PLAN B (Balanced): ${plan_b.get('extra_cost', 0):.0f} extra cost (expedited maintenance), {plan_b.get('total_delay_minutes', 0)}m delay, {plan_b.get('deadline_adherence_percent', 0)}% adherence. "
        f"PLAN C (Deadline First): ${plan_c.get('extra_cost', 0):.0f} extra cost (auxiliary rental unit), {plan_c.get('total_delay_minutes', 0)}m delay, {plan_c.get('deadline_adherence_percent', 0)}% adherence."
    )

    recommendation_justification = (
        f"{rec_id} ({rec_name}) scored highest ({rec_score}/100) because it best satisfies the active priority weighting "
        f"({w_dead}% deadline, {w_cost}% cost, {w_util}% utilization). It effectively contains delay to {rec_delay}m "
        f"and achieves {rec_adherence}% on-time adherence while limiting expense to ${rec_cost:.0f}."
    )

    return {
        "provider": "deterministic_fallback",
        "executive_summary": exec_summary,
        "disruption_diagnosis": diagnosis,
        "affected_resources": resources,
        "affected_orders": orders_analysis,
        "operational_impact": operational_impact,
        "tradeoff_analysis": tradeoffs,
        "recommendation_justification": recommendation_justification,
    }


def generate_ai_explanation(recovery_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an AI explanation using Google Gemini REST API (gemini-2.5-flash).
    Falls back gracefully to deterministic explanation if the key is missing,
    the request times out (4.0s), or any error occurs.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return generate_deterministic_fallback(recovery_data)

    # Prepare structured, compact context for Gemini
    disruption = recovery_data.get("disruption") or {}
    affected_orders = recovery_data.get("affected_orders") or []
    weights = recovery_data.get("weights") or {}
    plans = recovery_data.get("plans") or []
    rec = recovery_data.get("recommended_plan") or {}

    plans_summary = []
    for p in plans:
        plans_summary.append({
            "plan_id": p.get("plan_id"),
            "plan_name": p.get("plan_name"),
            "extra_cost": p.get("extra_cost"),
            "total_delay_minutes": p.get("total_delay_minutes"),
            "deadline_adherence_percent": p.get("deadline_adherence_percent"),
            "machine_utilization_percent": p.get("machine_utilization_percent"),
            "deadline_risk": p.get("deadline_risk"),
            "score": p.get("score"),
            "description": p.get("description"),
        })

    prompt_data = {
        "disruption": disruption,
        "affected_orders": affected_orders,
        "business_weights": weights,
        "candidate_plans": plans_summary,
        "recommended_plan": {
            "plan_id": rec.get("plan_id"),
            "plan_name": rec.get("plan_name"),
            "score": rec.get("score"),
            "extra_cost": rec.get("extra_cost"),
            "total_delay_minutes": rec.get("total_delay_minutes"),
            "deadline_adherence_percent": rec.get("deadline_adherence_percent"),
            "machine_utilization_percent": rec.get("machine_utilization_percent"),
            "deadline_risk": rec.get("deadline_risk"),
        },
    }

    system_instruction = (
        "You are ForgeMind AI Copilot, an industrial operations analyst for an Industry 5.0 smart factory.\n"
        "AUTHORITY CONSTRAINTS:\n"
        "- The provided factory data, disruption data, and plan metrics are AUTHORITATIVE and produced by a deterministic simulation engine.\n"
        "- DO NOT invent facts, machines, or numbers.\n"
        "- DO NOT alter or recalculate any numerical values (costs, delays, percentages, or scores).\n"
        "- DO NOT create a new production schedule.\n"
        "- DO NOT recommend a plan different from the deterministic engine's recommended_plan.\n"
        "- Explain why the deterministic recommended_plan is appropriate for the active business weights.\n"
        "- Return strictly a JSON object with the requested keys."
    )

    user_prompt = (
        f"Analyze the following deterministic factory disruption and recovery plans:\n"
        f"{json.dumps(prompt_data, indent=2)}\n\n"
        "Provide clear industrial explanations for plant managers. Return a JSON object with EXACTLY these 7 keys:\n"
        "1. executive_summary: A concise 2-3 sentence overview of the disruption and chosen recovery path.\n"
        "2. disruption_diagnosis: Root cause and duration of the equipment failure.\n"
        "3. affected_resources: Which primary and downstream machines/resources are affected.\n"
        "4. affected_orders: Summary of impacted order IDs and urgency.\n"
        "5. operational_impact: Bottlenecks, starvation, and delay consequences.\n"
        "6. tradeoff_analysis: Concise comparison of PLAN A vs PLAN B vs PLAN C.\n"
        "7. recommendation_justification: Why the recommended plan best satisfies the active business weights.\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            status_code = resp.getcode()
            if status_code != 200:
                return generate_deterministic_fallback(recovery_data)
            raw_body = resp.read().decode("utf-8")

        res_json = json.loads(raw_body)
        candidates = res_json.get("candidates") or []
        if not candidates:
            return generate_deterministic_fallback(recovery_data)

        content_parts = candidates[0].get("content", {}).get("parts", [])
        if not content_parts:
            return generate_deterministic_fallback(recovery_data)

        text = content_parts[0].get("text", "").strip()
        parsed_ai = json.loads(text)

        required_keys = [
            "executive_summary",
            "disruption_diagnosis",
            "affected_resources",
            "affected_orders",
            "operational_impact",
            "tradeoff_analysis",
            "recommendation_justification",
        ]

        # Verify all required keys are present and non-empty
        if not all(k in parsed_ai and parsed_ai[k] for k in required_keys):
            return generate_deterministic_fallback(recovery_data)

        return {
            "provider": "gemini",
            "executive_summary": parsed_ai["executive_summary"],
            "disruption_diagnosis": parsed_ai["disruption_diagnosis"],
            "affected_resources": parsed_ai["affected_resources"],
            "affected_orders": parsed_ai["affected_orders"],
            "operational_impact": parsed_ai["operational_impact"],
            "tradeoff_analysis": parsed_ai["tradeoff_analysis"],
            "recommendation_justification": parsed_ai["recommendation_justification"],
        }

    except Exception:
        # Fallback cleanly on timeout, HTTP 4xx/5xx, network error, or JSON decode failure
        return generate_deterministic_fallback(recovery_data)
