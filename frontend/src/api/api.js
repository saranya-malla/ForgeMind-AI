/**
 * ForgeMind AI - API Service
 * Centralized API client for communicating with the FastAPI backend.
 */

export const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch all machines from the backend.
 */
export async function fetchMachines() {
  const res = await fetch(`${API_BASE_URL}/machines`);
  if (!res.ok) {
    throw new Error(`Failed to fetch machines (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Fetch all production orders from the backend.
 */
export async function fetchOrders() {
  const res = await fetch(`${API_BASE_URL}/orders`);
  if (!res.ok) {
    throw new Error(`Failed to fetch orders (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Trigger disruption simulation.
 */
export async function simulateDisruption(disruptionId = "D001") {
  const res = await fetch(`${API_BASE_URL}/simulate-disruption`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ disruption_id: disruptionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to simulate disruption (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Generate recovery plans with configurable business weights.
 */
export async function generateRecoveryPlans(weights = { deadline_weight: 0.50, cost_weight: 0.30, utilization_weight: 0.20 }) {
  const res = await fetch(`${API_BASE_URL}/generate-recovery-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(weights),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to generate recovery plans (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Approve a selected recovery plan.
 */
export async function approvePlan(planId) {
  const res = await fetch(`${API_BASE_URL}/approve-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to approve plan (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Fetch the currently active production schedule and approved recovery metadata.
 */
export async function fetchProductionSchedule() {
  const res = await fetch(`${API_BASE_URL}/production-schedule`);
  if (!res.ok) {
    throw new Error(`Failed to fetch production schedule (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Request AI explanation and operational reasoning for the latest candidate recovery plans.
 */
export async function fetchAiExplanation() {
  const res = await fetch(`${API_BASE_URL}/explain-recovery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch AI explanation (Status: ${res.status})`);
  }
  return res.json();
}

/**
 * Check backend health.
 */
export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Backend unhealthy (Status: ${res.status})`);
  }
  return res.json();
}
