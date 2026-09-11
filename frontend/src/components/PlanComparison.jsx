export function PlanComparison({ plans }) {
  if (!plans || plans.length === 0) return null;

  // Max values for relative scaling
  const maxDelay = Math.max(...plans.map((p) => p.total_delay_minutes), 1);
  const maxCost = Math.max(...plans.map((p) => p.extra_cost), 1);

  // Map plans by plan_id or standard order
  const planColors = {
    PLAN_A: "#10b981", // green for cost saver
    PLAN_B: "#3b82f6", // blue for balanced
    PLAN_C: "#8b5cf6", // purple for deadline first
  };

  return (
    <div className="plan-comparison-card">
      <div className="comparison-header">
        <h3>Comparative Performance Metrics</h3>
        <span className="section-count">CSS-Rendered Multi-Attribute Comparison</span>
      </div>

      <div className="comparison-metrics-grid">
        {/* Metric 1: Score Comparison */}
        <div className="comparison-metric-block">
          <div className="metric-block-header">
            <h4>Composite Score</h4>
            <span className="metric-hint">Higher is better (0 - 100)</span>
          </div>
          <div className="bars-container">
            {plans.map((p) => (
              <div key={`score-${p.plan_id}`} className="bar-row">
                <span className="bar-label font-mono">{p.plan_id}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(5, p.score))}%`,
                      backgroundColor: planColors[p.plan_id] || "#3b82f6",
                    }}
                  ></div>
                </div>
                <span className="bar-value font-mono">{p.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2: Delay Comparison */}
        <div className="comparison-metric-block">
          <div className="metric-block-header">
            <h4>Total Schedule Delay</h4>
            <span className="metric-hint">Lower is better</span>
          </div>
          <div className="bars-container">
            {plans.map((p) => {
              const pct = Math.round((p.total_delay_minutes / maxDelay) * 100);
              return (
                <div key={`delay-${p.plan_id}`} className="bar-row">
                  <span className="bar-label font-mono">{p.plan_id}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-delay"
                      style={{
                        width: `${Math.max(5, pct)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="bar-value font-mono">{p.total_delay_minutes}m</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric 3: Cost Comparison */}
        <div className="comparison-metric-block">
          <div className="metric-block-header">
            <h4>Extra Recovery Cost</h4>
            <span className="metric-hint">Lower is better</span>
          </div>
          <div className="bars-container">
            {plans.map((p) => {
              const pct = p.extra_cost === 0 ? 0 : Math.round((p.extra_cost / maxCost) * 100);
              return (
                <div key={`cost-${p.plan_id}`} className="bar-row">
                  <span className="bar-label font-mono">{p.plan_id}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-cost"
                      style={{
                        width: `${Math.max(pct === 0 ? 0 : 5, pct)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="bar-value font-mono">${p.extra_cost}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlanComparison;
