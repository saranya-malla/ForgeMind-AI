export function AiReasoningPanel({ explanation, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="ai-reasoning-panel ai-loading-state">
        <div className="ai-panel-header">
          <div className="ai-badge-group">
            <span className="badge badge-ai-copilot">🤖 ForgeMind AI Copilot</span>
            <span className="badge badge-analyzing">Analyzing Scenarios...</span>
          </div>
        </div>
        <div className="ai-loading-content">
          <div className="spinner"></div>
          <p>Synthesizing operational trade-offs and root-cause impact from deterministic engine data...</p>
        </div>
      </div>
    );
  }

  if (error && !explanation) {
    return (
      <div className="ai-reasoning-panel ai-error-state">
        <div className="ai-panel-header">
          <div className="ai-badge-group">
            <span className="badge badge-ai-copilot">🤖 ForgeMind AI Copilot</span>
            <span className="badge badge-offline">Offline</span>
          </div>
        </div>
        <p className="ai-error-msg">
          AI Copilot reasoning temporarily unavailable ({error}). Deterministic recovery plans and manager approval remain fully functional.
        </p>
      </div>
    );
  }

  if (!explanation) {
    return null;
  }

  const isGemini = explanation.provider === "gemini";

  return (
    <div className="ai-reasoning-panel">
      <div className="ai-panel-header">
        <div className="ai-badge-group">
          <span className="badge badge-ai-copilot">🤖 ForgeMind AI Copilot</span>
          <span className={`badge ${isGemini ? "badge-gemini" : "badge-fallback"}`}>
            {isGemini ? "⚡ Gemini AI" : "⚙️ Deterministic Fallback"}
          </span>
        </div>
        <span className="ai-timestamp-note">Advisory Reasoning Layer</span>
      </div>

      <div className="ai-panel-body">
        {/* 1. Executive Summary */}
        <div className="ai-section ai-exec-summary">
          <h4 className="ai-section-title">1. Executive Summary</h4>
          <p className="ai-text">{explanation.executive_summary}</p>
        </div>

        {/* 2 - 5. Operational Analysis Grid */}
        <div className="ai-grid-2x2">
          <div className="ai-card">
            <h5 className="ai-card-title">2. Disruption Diagnosis</h5>
            <p className="ai-text">{explanation.disruption_diagnosis}</p>
          </div>
          <div className="ai-card">
            <h5 className="ai-card-title">3. Affected Resources</h5>
            <p className="ai-text">{explanation.affected_resources}</p>
          </div>
          <div className="ai-card">
            <h5 className="ai-card-title">4. Affected Orders</h5>
            <p className="ai-text">{explanation.affected_orders}</p>
          </div>
          <div className="ai-card">
            <h5 className="ai-card-title">5. Operational Impact</h5>
            <p className="ai-text">{explanation.operational_impact}</p>
          </div>
        </div>

        {/* 6. Plan Trade-offs */}
        <div className="ai-section ai-tradeoffs">
          <h4 className="ai-section-title">6. Plan Trade-offs</h4>
          <p className="ai-text">{explanation.tradeoff_analysis}</p>
        </div>

        {/* 7. Why ForgeMind Recommended This Plan */}
        <div className="ai-section ai-recommendation">
          <h4 className="ai-section-title">7. Why ForgeMind Recommended This Plan</h4>
          <p className="ai-text">{explanation.recommendation_justification}</p>
        </div>
      </div>

      <div className="ai-panel-footer">
        <span className="ai-grounding-notice">
          ℹ️ The deterministic recovery engine remains the sole source of truth for schedules, costs, and scores.
        </span>
      </div>
    </div>
  );
}

export default AiReasoningPanel;
