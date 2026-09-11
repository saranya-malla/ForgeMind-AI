export function RecommendationCard({ recommendedPlan }) {
  if (!recommendedPlan) return null;

  // Generate dynamic, metric-based explanation
  const adherence = recommendedPlan.deadline_adherence_percent;
  const cost = recommendedPlan.extra_cost;
  const delay = recommendedPlan.total_delay_minutes;

  let justification = "";
  if (cost === 0) {
    justification = `Selected to eliminate additional financial exposure ($0 cost), prioritizing critical orders while absorbing ${delay}m of downstream delay.`;
  } else if (delay <= 100) {
    justification = `Selected to aggressively protect delivery commitments, cutting total delays down to ${delay}m with ${adherence}% deadline adherence.`;
  } else {
    justification = `Achieves the highest overall score (${recommendedPlan.score}/100) by balancing moderate expenditure ($${cost}) with ${adherence}% on-time adherence and reduced delay (${delay}m).`;
  }

  return (
    <div className="recommendation-card">
      <div className="recommendation-header">
        <div className="recommendation-badge">
          <span>⚡ ForgeMind Recommendation</span>
        </div>
        <div className="recommendation-score">
          Score: <strong className="font-mono">{recommendedPlan.score}</strong> / 100
        </div>
      </div>

      <div className="recommendation-body">
        <h3 className="rec-plan-title">
          {recommendedPlan.plan_id}: {recommendedPlan.plan_name}
        </h3>
        <p className="rec-explanation">
          {justification}
        </p>
        <div className="rec-highlights">
          <div className="rec-stat">
            <span className="rec-stat-label">Adherence</span>
            <span className="rec-stat-val font-mono">{recommendedPlan.deadline_adherence_percent}%</span>
          </div>
          <div className="rec-stat">
            <span className="rec-stat-label">Total Delay</span>
            <span className="rec-stat-val font-mono">{recommendedPlan.total_delay_minutes} min</span>
          </div>
          <div className="rec-stat">
            <span className="rec-stat-label">Extra Cost</span>
            <span className="rec-stat-val font-mono">${recommendedPlan.extra_cost}</span>
          </div>
          <div className="rec-stat">
            <span className="rec-stat-label">Risk Level</span>
            <span className="rec-stat-val font-mono">{recommendedPlan.deadline_risk}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecommendationCard;
