"""
ForgeMind AI - Deterministic Recovery Engine
Domain: Industry 5.0 - Adaptive Production Planning & Disruption Management
Team: NexForge

This engine:
1. Loads simulation datasets (machines, workers, orders, processes, disruptions).
2. Simulates factory operations and models the machine breakdown disruption.
3. Generates three distinct, realistic recovery plans:
   - PLAN A: Cost Saver (No added cost, sequential rescheduling on repaired M2, priority sequencing)
   - PLAN B: Balanced (Expedited repair to reduce M2 downtime to 60m at moderate cost)
   - PLAN C: Deadline First (Auxiliary drilling capacity deployed to minimize deadline violations)
4. Calculates metrics per plan strictly from the simulated schedule:
   - Total delay minutes
   - Deadline adherence %
   - Deadline risk
   - Extra monetary cost
   - Fair machine utilization % (including auxiliary resources where applicable)
5. Dynamically scores every plan using supplied business weights without hardcoding winners.
6. Ranks plans and selects the highest scoring plan as the recommended plan.
"""

import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def minutes_to_time(minutes: int, base_hour: int = 8, base_minute: int = 0) -> str:
    """Convert minutes from simulation start (08:00) to HH:MM format."""
    total_minutes = base_hour * 60 + base_minute + minutes
    hours = (total_minutes // 60) % 24
    mins = total_minutes % 60
    return f"{hours:02d}:{mins:02d}"


def time_to_minutes(time_str: str, base_hour: int = 8, base_minute: int = 0) -> int:
    """Convert HH:MM format to minutes from simulation start (08:00)."""
    parts = time_str.strip().split(":")
    hours = int(parts[0])
    mins = int(parts[1]) if len(parts) > 1 else 0
    total_minutes = hours * 60 + mins
    base_total = base_hour * 60 + base_minute
    return total_minutes - base_total


def load_simulation_data(data_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Load all 5 JSON datasets from the data directory.
    Searches in relative paths or standard project locations.
    """
    if data_dir is None:
        # Check standard relative locations
        candidates = [
            Path("data"),
            Path("../data"),
            Path(__file__).resolve().parent.parent / "data",
        ]
        for c in candidates:
            if c.exists() and (c / "orders.json").exists():
                data_path = c
                break
        else:
            data_path = Path("data")
    else:
        data_path = Path(data_dir)

    files = {
        "machines": "machines.json",
        "workers": "workers.json",
        "orders": "orders.json",
        "processes": "processes.json",
        "disruptions": "disruptions.json",
    }

    data: Dict[str, Any] = {}
    for key, filename in files.items():
        filepath = data_path / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Required dataset file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            data[key] = json.load(f)

    return data


class FactoryScheduler:
    """
    Deterministic schedule simulator that enforces:
    1. Strict process stage dependencies (Cutting -> Drilling -> Assembly -> Finishing)
    2. Strict machine capabilities (M1: Cutting, M2: Drilling, M3: Assembly, M4: Finishing, M2_AUX: Drilling)
    3. Machine single-occupancy queues
    """

    def __init__(self, processes_data: Dict[str, Any]):
        self.stage_durations = {}
        for stage in processes_data.get("stages", []):
            self.stage_durations[stage["process"]] = stage["duration_minutes"]

        # Default process stage sequence
        self.process_sequence = ["Cutting", "Drilling", "Assembly", "Finishing"]

    def simulate(
        self,
        orders: List[Dict[str, Any]],
        drilling_resources: List[Dict[str, Any]],
        priority_order_ids: Optional[List[str]] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]], int]:
        """
        Simulate schedule execution.
        orders: List of order dictionaries.
        drilling_resources: List of drilling machine specs, e.g.:
          [{"id": "M2", "available_from": 210}]
          or with auxiliary drill:
          [{"id": "M2", "available_from": 210}, {"id": "M2_AUX_RENTAL", "available_from": 30}]
        priority_order_ids: Optional ordering of order IDs for sequencing.
        """
        # Sort orders according to priority sequence if supplied
        if priority_order_ids:
            order_map = {o["id"]: o for o in orders}
            ordered_list = [order_map[oid] for oid in priority_order_ids if oid in order_map]
            # append any remaining
            for o in orders:
                if o not in ordered_list:
                    ordered_list.append(o)
        else:
            ordered_list = list(orders)

        # Track machine availability timelines (next available minute)
        # Standard machines
        machine_next_available = {
            "M1": 0,   # Cutting available from start (t=0)
            "M3": 0,   # Assembly available from start (t=0)
            "M4": 0,   # Finishing available from start (t=0)
        }
        # Drilling resources availability
        drilling_resource_timelines = {
            res["id"]: res.get("available_from", 0) for res in drilling_resources
        }

        # Track machine logs for utilization
        machine_operations: Dict[str, List[Dict[str, Any]]] = {
            "M1": [],
            "M3": [],
            "M4": [],
        }
        for res in drilling_resources:
            machine_operations[res["id"]] = []

        order_results = []

        # Track when each order finishes each stage
        # order_id -> {process: finish_minute}
        order_stage_finish: Dict[str, Dict[str, int]] = {o["id"]: {} for o in ordered_list}

        # To respect manufacturing flow, we simulate stage by stage or event-driven.
        # Since cutting has 1 machine M1, orders undergo Cutting in their sequenced order.
        # Stage 1: Cutting on M1
        for order in ordered_list:
            oid = order["id"]
            dur = self.stage_durations["Cutting"]
            start_m = machine_next_available["M1"]
            end_m = start_m + dur
            machine_next_available["M1"] = end_m
            order_stage_finish[oid]["Cutting"] = end_m
            machine_operations["M1"].append({
                "order_id": oid,
                "process": "Cutting",
                "start": start_m,
                "end": end_m,
                "duration": dur,
            })

        # Stage 2: Drilling on available drilling resource(s)
        # Orders become ready for drilling at order_stage_finish[oid]["Cutting"]
        # When an order is ready, it is assigned to whichever capable drilling resource becomes free earliest.
        # If orders are prioritized, they get assignment preference.
        for order in ordered_list:
            oid = order["id"]
            ready_time = order_stage_finish[oid]["Cutting"]
            dur = self.stage_durations["Drilling"]

            # Select drilling resource that can start this order earliest
            best_res = None
            earliest_start = float("inf")

            for res in drilling_resources:
                res_id = res["id"]
                res_free_time = drilling_resource_timelines[res_id]
                start_time = max(ready_time, res_free_time)
                if start_time < earliest_start:
                    earliest_start = start_time
                    best_res = res_id

            start_m = int(earliest_start)
            end_m = start_m + dur
            drilling_resource_timelines[best_res] = end_m
            order_stage_finish[oid]["Drilling"] = end_m
            machine_operations[best_res].append({
                "order_id": oid,
                "process": "Drilling",
                "start": start_m,
                "end": end_m,
                "duration": dur,
            })

        # Stage 3: Assembly on M3
        # Orders become ready for assembly once Drilling completes.
        # Sort orders by when drilling completed, respecting priority order.
        assembly_order = sorted(
            ordered_list,
            key=lambda o: (order_stage_finish[o["id"]]["Drilling"])
        )
        for order in assembly_order:
            oid = order["id"]
            ready_time = order_stage_finish[oid]["Drilling"]
            dur = self.stage_durations["Assembly"]
            start_m = max(ready_time, machine_next_available["M3"])
            end_m = start_m + dur
            machine_next_available["M3"] = end_m
            order_stage_finish[oid]["Assembly"] = end_m
            machine_operations["M3"].append({
                "order_id": oid,
                "process": "Assembly",
                "start": start_m,
                "end": end_m,
                "duration": dur,
            })

        # Stage 4: Finishing on M4
        # Orders become ready once Assembly completes.
        finishing_order = sorted(
            ordered_list,
            key=lambda o: (order_stage_finish[o["id"]]["Assembly"])
        )
        for order in finishing_order:
            oid = order["id"]
            ready_time = order_stage_finish[oid]["Assembly"]
            dur = self.stage_durations["Finishing"]
            start_m = max(ready_time, machine_next_available["M4"])
            end_m = start_m + dur
            machine_next_available["M4"] = end_m
            order_stage_finish[oid]["Finishing"] = end_m
            machine_operations["M4"].append({
                "order_id": oid,
                "process": "Finishing",
                "start": start_m,
                "end": end_m,
                "duration": dur,
            })

        # Build schedule output per order
        total_makespan = 0
        for order in orders:
            oid = order["id"]
            deadline_m = time_to_minutes(order["deadline"])
            completion_m = order_stage_finish[oid]["Finishing"]
            delay_m = max(0, completion_m - deadline_m)
            total_makespan = max(total_makespan, completion_m)

            # Assemble stage-by-stage records
            stages_record = []
            for proc in self.process_sequence:
                # Find machine used
                for m_id, ops in machine_operations.items():
                    for op in ops:
                        if op["order_id"] == oid and op["process"] == proc:
                            stages_record.append({
                                "process": proc,
                                "machine": m_id,
                                "start_minute": op["start"],
                                "end_minute": op["end"],
                                "start_time": minutes_to_time(op["start"]),
                                "end_time": minutes_to_time(op["end"]),
                                "duration_minutes": op["duration"],
                            })
                            break

            order_results.append({
                "order_id": oid,
                "product": order["product"],
                "priority": order["priority"],
                "quantity": order["quantity"],
                "deadline": order["deadline"],
                "deadline_minutes": deadline_m,
                "completion_minute": completion_m,
                "completion_time": minutes_to_time(completion_m),
                "delay_minutes": delay_m,
                "on_time": delay_m == 0,
                "stages": stages_record,
            })

        return order_results, machine_operations, total_makespan


def calculate_metrics_and_score(
    plan_id: str,
    plan_name: str,
    description: str,
    orders_schedule: List[Dict[str, Any]],
    machine_operations: Dict[str, List[Dict[str, Any]]],
    total_makespan: int,
    extra_cost: float,
    deadline_weight: float = 0.50,
    cost_weight: float = 0.30,
    utilization_weight: float = 0.20,
    cost_ceiling: float = 1500.0,
) -> Dict[str, Any]:
    """
    Calculate metrics and dynamic score for a recovery plan.
    - Measures actual deadline adherence from schedule.
    - Fair machine utilization across all active machines.
    - Normalizes components to 0-100 and applies weights.
    """
    total_orders = len(orders_schedule)
    on_time_orders = sum(1 for o in orders_schedule if o["on_time"])
    adherence_percent = round((on_time_orders / total_orders) * 100.0, 1) if total_orders > 0 else 0.0
    total_delay_minutes = sum(o["delay_minutes"] for o in orders_schedule)

    # Deadline risk category
    if adherence_percent >= 90.0:
        deadline_risk = "Low"
    elif adherence_percent >= 60.0:
        deadline_risk = "Medium"
    else:
        deadline_risk = "High"

    # Fair machine utilization:
    # Sum of busy processing minutes across all active machines in this plan
    # divided by (total_makespan * number of active machines)
    active_machines = list(machine_operations.keys())
    num_active_machines = len(active_machines)
    total_busy_minutes = sum(
        sum(op["duration"] for op in ops) for ops in machine_operations.values()
    )
    total_available_capacity = total_makespan * num_active_machines if total_makespan > 0 else 1
    utilization_percent = round((total_busy_minutes / total_available_capacity) * 100.0, 1)

    # Normalized component scores (0 - 100)
    # 1. Deadline adherence score (already 0 - 100)
    s_adherence = adherence_percent

    # 2. Cost score: 100 when extra_cost = 0, decreases towards 0 at cost_ceiling
    s_cost = max(0.0, min(100.0, 100.0 * (1.0 - (extra_cost / cost_ceiling))))

    # 3. Utilization score (already 0 - 100)
    s_util = utilization_percent

    # 4. Total delay penalty (soft penalty to reward lower total minutes of delay)
    # Scaled to not exceed 15 points
    delay_penalty = min(15.0, (total_delay_minutes / 30.0) * 1.5)

    # Normalize weights if their sum is not 1.0
    weight_sum = deadline_weight + cost_weight + utilization_weight
    if weight_sum > 0:
        w_d = deadline_weight / weight_sum
        w_c = cost_weight / weight_sum
        w_u = utilization_weight / weight_sum
    else:
        w_d, w_c, w_u = 0.50, 0.30, 0.20

    raw_score = (w_d * s_adherence + w_c * s_cost + w_u * s_util) - delay_penalty
    final_score = round(max(0.0, min(100.0, raw_score)), 2)

    affected_orders = [o["order_id"] for o in orders_schedule if o["delay_minutes"] > 0]

    return {
        "plan_id": plan_id,
        "plan_name": plan_name,
        "description": description,
        "affected_orders": affected_orders,
        "total_delay_minutes": total_delay_minutes,
        "extra_cost": extra_cost,
        "machine_utilization_percent": utilization_percent,
        "deadline_adherence_percent": adherence_percent,
        "deadline_risk": deadline_risk,
        "score": final_score,
        "score_components": {
            "adherence_score": round(s_adherence, 1),
            "cost_score": round(s_cost, 1),
            "utilization_score": round(s_util, 1),
            "delay_penalty": round(delay_penalty, 1),
        },
        "makespan_minutes": total_makespan,
        "makespan_time": minutes_to_time(total_makespan),
        "schedule": orders_schedule,
    }


def generate_recovery_plans(
    deadline_weight: float = 0.50,
    cost_weight: float = 0.30,
    utilization_weight: float = 0.20,
    data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main reusable recovery engine function.
    Generates three recovery plans for the primary M2 disruption scenario,
    calculates metrics from actual simulation, dynamically scores and ranks them.
    """
    data = load_simulation_data(data_dir)
    orders = data.get("orders", [])
    processes = data.get("processes", {})
    disruptions = data.get("disruptions", [])

    # Identify primary disruption (D001 on M2)
    primary_disruption = disruptions[0] if disruptions else {
        "id": "D001",
        "type": "machine_breakdown",
        "machine": "M2",
        "process": "Drilling",
        "duration_minutes": 180,
        "severity": "High",
        "status": "simulated",
    }

    scheduler = FactoryScheduler(processes)

    # Disruption timeline:
    # First order finishes Cutting at t=30m. That is when M2 is needed and breakdown is realized.
    # Total breakdown duration = 180m.
    disruption_start_m = 30
    m2_full_repair_m = disruption_start_m + primary_disruption.get("duration_minutes", 180)  # 210m

    # Priority ranking function for orders: High > Medium > Low, then earlier deadline
    priority_map = {"High": 1, "Medium": 2, "Low": 3}
    def order_sort_key(o: Dict[str, Any]) -> Tuple[int, int]:
        return (priority_map.get(o["priority"], 99), time_to_minutes(o["deadline"]))

    prioritized_orders = sorted(orders, key=order_sort_key)
    prioritized_order_ids = [o["id"] for o in prioritized_orders]

    # -------------------------------------------------------------
    # PLAN A — COST SAVER
    # - Extra Cost: $0
    # - Reschedules sequentially on M2 once repaired at t=210m
    # - Orders sequenced strictly by Priority (High > Medium > Low) and Deadline
    # -------------------------------------------------------------
    plan_a_drilling_resources = [{"id": "M2", "available_from": m2_full_repair_m}]
    sched_a, ops_a, makespan_a = scheduler.simulate(
        orders=deepcopy(orders),
        drilling_resources=plan_a_drilling_resources,
        priority_order_ids=prioritized_order_ids,
    )
    plan_a_eval = calculate_metrics_and_score(
        plan_id="PLAN_A",
        plan_name="Cost Saver",
        description=(
            "Zero extra monetary cost. Reschedules all drilling sequentially on M2 "
            "after full standard repair (available at 11:30). High-priority orders are "
            "processed first to protect critical commitments while accepting lower-priority delays."
        ),
        orders_schedule=sched_a,
        machine_operations=ops_a,
        total_makespan=makespan_a,
        extra_cost=0.0,
        deadline_weight=deadline_weight,
        cost_weight=cost_weight,
        utilization_weight=utilization_weight,
    )

    # -------------------------------------------------------------
    # PLAN B — BALANCED
    # - Extra Cost: $450 (Expedited technician maintenance service)
    # - Reduces M2 downtime from 180m to 60m (M2 available at t=90m)
    # - Balanced dispatching to optimize overall flow and minimize delays
    # -------------------------------------------------------------
    m2_expedited_repair_m = disruption_start_m + 60  # 90m
    plan_b_drilling_resources = [{"id": "M2", "available_from": m2_expedited_repair_m}]
    sched_b, ops_b, makespan_b = scheduler.simulate(
        orders=deepcopy(orders),
        drilling_resources=plan_b_drilling_resources,
        priority_order_ids=prioritized_order_ids,
    )
    plan_b_eval = calculate_metrics_and_score(
        plan_id="PLAN_B",
        plan_name="Balanced",
        description=(
            "Moderate cost ($450) for expedited maintenance team dispatch, reducing M2 downtime "
            "from 180 to 60 minutes (ready at 09:30). Balances moderate cost with reduced delays."
        ),
        orders_schedule=sched_b,
        machine_operations=ops_b,
        total_makespan=makespan_b,
        extra_cost=450.0,
        deadline_weight=deadline_weight,
        cost_weight=cost_weight,
        utilization_weight=utilization_weight,
    )

    # -------------------------------------------------------------
    # PLAN C — DEADLINE FIRST
    # - Extra Cost: $1,200 (Auxiliary mobile drilling unit M2_AUX_RENTAL)
    # - Auxiliary drilling resource deployed to minimize deadline violations
    # - Performs drilling in parallel once M2 recovers; fair utilization across all resources
    # - Deadline adherence is calculated strictly from simulation (not hardcoded)
    # -------------------------------------------------------------
    plan_c_drilling_resources = [
        {"id": "M2", "available_from": m2_full_repair_m},             # M2 standard repair
        {"id": "M2_AUX_RENTAL", "available_from": disruption_start_m},  # Auxiliary drilling unit ready at t=30
    ]
    sched_c, ops_c, makespan_c = scheduler.simulate(
        orders=deepcopy(orders),
        drilling_resources=plan_c_drilling_resources,
        priority_order_ids=prioritized_order_ids,
    )
    plan_c_eval = calculate_metrics_and_score(
        plan_id="PLAN_C",
        plan_name="Deadline First",
        description=(
            "High priority on protecting deadlines ($1,200). Deploys an emergency auxiliary "
            "drilling unit (M2_AUX_RENTAL) at 08:30 to run drilling operations, working alongside "
            "M2 once repaired. Deadline adherence is calculated from simulated schedule."
        ),
        orders_schedule=sched_c,
        machine_operations=ops_c,
        total_makespan=makespan_c,
        extra_cost=1200.0,
        deadline_weight=deadline_weight,
        cost_weight=cost_weight,
        utilization_weight=utilization_weight,
    )

    # Collect and rank plans strictly by dynamic score
    plans = [plan_a_eval, plan_b_eval, plan_c_eval]
    plans.sort(key=lambda p: p["score"], reverse=True)

    recommended_plan = plans[0]

    # Global affected orders across baseline
    all_affected_orders = sorted(
        list(set(plan_a_eval["affected_orders"] + plan_b_eval["affected_orders"]))
    )

    return {
        "disruption": primary_disruption,
        "affected_orders": all_affected_orders,
        "plans": plans,
        "recommended_plan": recommended_plan,
        "weights": {
            "deadline_weight": deadline_weight,
            "cost_weight": cost_weight,
            "utilization_weight": utilization_weight,
        },
    }


def print_simulation_demo():
    """CLI demonstration of the recovery engine and primary scenario."""
    print("=" * 78)
    print(" ForgeMind AI - Deterministic Recovery Engine Demonstration")
    print(" Team: NexForge | Industry 5.0")
    print("=" * 78)

    result = generate_recovery_plans(
        deadline_weight=0.50,
        cost_weight=0.30,
        utilization_weight=0.20,
    )

    disruption = result["disruption"]
    print(f"\n[DISRUPTION DETECTED]")
    print(f"ID:        {disruption.get('id')}")
    print(f"Machine:   {disruption.get('machine')} (Process: {disruption.get('process')})")
    print(f"Downtime:  {disruption.get('duration_minutes')} minutes")
    print(f"Severity:  {disruption.get('severity')}")
    print(f"Status:    {disruption.get('status')}")

    print(f"\n[AFFECTED ORDERS UNDER BASELINE DOWNSTREAM]")
    print(f"Order IDs: {', '.join(result['affected_orders'])}")

    print(f"\n[CONFIGURED BUSINESS WEIGHTS]")
    weights = result["weights"]
    print(f"Deadline Adherence: {weights['deadline_weight']:.0%}")
    print(f"Cost Minimization:  {weights['cost_weight']:.0%}")
    print(f"Resource Util:      {weights['utilization_weight']:.0%}")

    print("\n" + "=" * 78)
    print(f"{'PLAN ID':<10} | {'NAME':<15} | {'COST':<8} | {'DELAYS':<10} | {'ADHERENCE':<10} | {'SCORE':<8}")
    print("-" * 78)
    for p in result["plans"]:
        print(
            f"{p['plan_id']:<10} | "
            f"{p['plan_name']:<15} | "
            f"${p['extra_cost']:<7.0f} | "
            f"{p['total_delay_minutes']}m{'':<6} | "
            f"{p['deadline_adherence_percent']}%{'':<4} | "
            f"{p['score']:.2f}"
        )
    print("=" * 78)

    rec = result["recommended_plan"]
    print(f"\n>>> RECOMMENDED PLAN: {rec['plan_id']} ({rec['plan_name']})")
    print(f"Score:               {rec['score']} / 100")
    print(f"Deadline Adherence:  {rec['deadline_adherence_percent']}%")
    print(f"Total Delay:         {rec['total_delay_minutes']} minutes")
    print(f"Extra Cost:          ${rec['extra_cost']:.0f}")
    print(f"Machine Utilization: {rec['machine_utilization_percent']}%")
    print(f"Deadline Risk:       {rec['deadline_risk']}")
    print(f"Description:         {rec['description']}")

    print("\n[SCHEDULE FOR RECOMMENDED PLAN]")
    for item in rec["schedule"]:
        status_str = "ON-TIME" if item["on_time"] else f"DELAYED (+{item['delay_minutes']}m)"
        print(
            f"Order {item['order_id']} ({item['priority']:<6}) | "
            f"Deadline: {item['deadline']} | "
            f"Completed: {item['completion_time']} | "
            f"Status: {status_str}"
        )
    print("=" * 78)


if __name__ == "__main__":
    print_simulation_demo()
