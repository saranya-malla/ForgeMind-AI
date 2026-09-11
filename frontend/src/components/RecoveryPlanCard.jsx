export function RecoveryPlanCard({ plan, isRecommended = false }) {
  const getRiskClass = (risk) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "badge-risk-low";
      case "medium":
        return "badge-risk-med";
      case "high":
        return "badge-risk-high";
      default:
        return "";
    }
  };

  return (
    <div className={`plan-card ${isRecommended ? "plan-card-recommended" : ""}`}>
      <div className="plan-card-header">
        <div className="plan-title-box">
          <span className="plan-id-tag">{plan.plan_id}</span>
          <h4 className="plan-name">{plan.plan_name}</h4>
        </div>
        <div className="plan-score-badge">
          <span className="score-num font-mono">{plan.score}</span>
          <span className="score-denom">/ 100</span>
        </div>
      </div>

      {isRecommended && (
        <div className="recommended-ribbon">
          ★ RECOMMENDED PLAN
        </div>
      )}

      <p className="plan-desc">{plan.description}</p>

      <div className="plan-metrics-grid">
        <div className="plan-metric-item">
          <span className="metric-label">Extra Cost</span>
          <span className="metric-val font-mono">
            ${Number(plan.extra_cost).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </span>
        </div>

        <div className="plan-metric-item">
          <span className="metric-label">Total Delay</span>
          <span className="metric-val font-mono">{plan.total_delay_minutes} min</span>
        </div>

        <div className="plan-metric-item">
          <span className="metric-label">Deadline Adherence</span>
          <span className="metric-val font-mono">{plan.deadline_adherence_percent}%</span>
        </div>

        <div className="plan-metric-item">
          <span className="metric-label">Machine Utilization</span>
          <span className="metric-val font-mono">{plan.machine_utilization_percent}%</span>
        </div>

        <div className="plan-metric-item metric-item-full">
          <span className="metric-label">Deadline Risk</span>
          <span className={`badge ${getRiskClass(plan.deadline_risk)}`}>
            {plan.deadline_risk} Risk
          </span>
        </div>
      </div>
    </div>
  );
}

export default RecoveryPlanCard;
