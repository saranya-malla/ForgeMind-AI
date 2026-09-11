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
  const agentStages = explanation.agent_stages || [
    { stage: "DISRUPTION_ANALYSIS", title: "Disruption Analysis", status: "COMPLETED" },
    { stage: "RESOURCE_IMPACT_ANALYSIS", title: "Resource Impact", status: "COMPLETED" },
    { stage: "RECOVERY_PLAN_EVALUATION", title: "Plan Evaluation", status: "COMPLETED" },
    { stage: "TRADEOFF_ANALYSIS", title: "Trade-off Analysis", status: "COMPLETED" },
    { stage: "RECOMMENDATION_EXPLANATION", title: "Recommendation", status: "COMPLETED" },
    { stage: "MANAGER_APPROVAL_HANDOFF", title: "Manager Handoff", status: "READY_FOR_DECISION" },
  ];

  return (
    <div className="ai-reasoning-panel">
      <div className="ai-panel-header">
        <div className="ai-badge-group">
          <span className="badge badge-ai-copilot">🤖 ForgeMind AI Agent</span>
          <span className={`badge ${isGemini ? "badge-gemini" : "badge-fallback"}`}>
            {isGemini ? "⚡ Gemini 2.5 Flash" : "⚙️ Deterministic Fallback"}
          </span>
          <span className="badge badge-agent-role">Industry 5.0 Advisory Copilot</span>
        </div>
        <span className="ai-timestamp-note">Advisory Reasoning Layer</span>
      </div>

      <div className="ai-panel-body">
        {/* Agent Workflow Execution Stages */}
        <div className="ai-stage-pipeline">
          <div className="ai-pipeline-header">
            <span className="ai-pipeline-title">Agent Workflow Stages:</span>
            <span className="ai-pipeline-status">
              ✓ 6/6 Stages Orchestrated
            </span>
          </div>
          <div className="ai-stages-bar">
            {agentStages.map((st, idx) => {
              const isHandoff = st.stage === "MANAGER_APPROVAL_HANDOFF" || st.status === "READY_FOR_DECISION";
              return (
                <div
                  key={st.stage || idx}
                  className={`ai-stage-pill ${isHandoff ? "stage-handoff" : "stage-completed"}`}
                  title={st.summary || st.title}
                >
                  <span className="stage-num">{idx + 1}</span>
                  <span className="stage-name">{st.title || st.stage}</span>
                  <span className="stage-icon">{isHandoff ? "✋" : "✓"}</span>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* 8. Stage 6: Manager Approval Handoff */}
        <div className="ai-section ai-handoff-section">
          <div className="ai-handoff-header">
            <h4 className="ai-section-title">Stage 6: Manager Approval Handoff (Human-in-the-Loop)</h4>
            <span className="badge badge-human-action">Human Action Required</span>
          </div>
          <p className="ai-text">
            {explanation.manager_approval_handoff ||
              "Human manager action required: Review the recommended plan and submit approval in the Manager Approval section below. The AI agent operates in advisory mode and cannot commit floor schedule changes."}
          </p>
        </div>
      </div>

      <div className="ai-panel-footer">
        <span className="ai-grounding-notice">
          ℹ️ The deterministic recovery engine remains the sole source of truth for schedules, costs, and scores. The AI agent provides operational decision support.
        </span>
      </div>
    </div>
  );
}

export default AiReasoningPanel;
