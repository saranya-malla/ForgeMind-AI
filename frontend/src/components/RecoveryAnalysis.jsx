import { useRef, useState, useEffect } from "react";
import BusinessPriorityControls from "./BusinessPriorityControls";
import RecoveryPlanCard from "./RecoveryPlanCard";
import RecommendationCard from "./RecommendationCard";
import PlanComparison from "./PlanComparison";
import ManagerApproval from "./ManagerApproval";
import AiReasoningPanel from "./AiReasoningPanel";
import { fetchAiExplanation } from "../api/api";

export function RecoveryAnalysis({
  disruption,
  affectedOrders = [],
  recoveryData,
  onApplyPriorities,
  onPlanApproved,
  isLoading = false,
  error = null,
}) {
  const controlsRef = useRef(null);

  // AI Copilot reasoning state (Hooks must be called unconditionally at top)
  const [aiExplanation, setAiExplanation] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (!recoveryData) {
      setAiExplanation(null);
      setAiError(null);
      return;
    }

    let isMounted = true;
    setIsAiLoading(true);
    setAiError(null);

    fetchAiExplanation()
      .then((data) => {
        if (isMounted) {
          setAiExplanation(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAiError(err.message || "Failed to load AI explanation.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAiLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recoveryData]);

  if (!recoveryData && !isLoading && !error) {
    return null;
  }

  const handleModifyClick = () => {
    if (controlsRef.current) {
      controlsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const plans = recoveryData?.plans || [];
  const recommendedPlan = recoveryData?.recommended_plan || null;
  const currentWeights = recoveryData?.weights || {
    deadline_weight: 0.5,
    cost_weight: 0.3,
    utilization_weight: 0.2,
  };

  return (
    <section className="dashboard-section recovery-analysis-section">
      <div className="section-header">
        <div>
          <h2>AI Recovery Analysis & Optimization</h2>
          <p className="section-sub">
            Deterministic evaluation of mitigation strategies for active disruptions
          </p>
        </div>
        <span className="badge badge-domain">Multi-Objective Optimization</span>
      </div>

      {/* 1. Disruption Summary */}
      <div className="disruption-summary-banner">
        <div className="summary-col">
          <span className="summary-label">Disruption Scenario</span>
          <span className="summary-value font-mono">{disruption?.id || "D001"}</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Failed Machine</span>
          <span className="summary-value font-mono">
            {disruption?.machine} (DrillPro)
          </span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Impacted Process</span>
          <span className="summary-value">{disruption?.process || "Drilling"}</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Estimated Downtime</span>
          <span className="summary-value">{disruption?.duration_minutes} min</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">Affected Orders</span>
          <span className="summary-value text-danger font-mono">
            {affectedOrders.length} Orders ({affectedOrders.join(", ")})
          </span>
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className="state-panel loading-panel" style={{ padding: "2rem" }}>
          <div className="spinner"></div>
          <p>Evaluating recovery plans and simulating schedule outcomes...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="alert alert-error" style={{ margin: "1rem 0" }}>
          <strong>Recovery Engine Error:</strong> {error}
        </div>
      )}

      {!isLoading && recoveryData && (
        <div className="recovery-flow-container">
          {/* 2. Business Priority Controls */}
          <div ref={controlsRef}>
            <BusinessPriorityControls
              currentWeights={currentWeights}
              onApplyPriorities={onApplyPriorities}
              isLoading={isLoading}
            />
          </div>

          {/* 3. Three Recovery Plan Cards */}
          <div className="recovery-plans-area">
            <h3 className="subsection-title">Evaluated Recovery Strategies</h3>
            <div className="plans-grid">
              {plans.map((p) => (
                <RecoveryPlanCard
                  key={p.plan_id}
                  plan={p}
                  isRecommended={p.plan_id === recommendedPlan?.plan_id}
                />
              ))}
            </div>
          </div>

          {/* 4. Dynamic Recommendation Card */}
          <RecommendationCard recommendedPlan={recommendedPlan} />

          {/* 5. CSS-Only Plan Comparison */}
          <PlanComparison plans={plans} />

          {/* 6. AI Reasoning Panel (ForgeMind AI Copilot) */}
          <AiReasoningPanel
            explanation={aiExplanation}
            isLoading={isAiLoading}
            error={aiError}
          />

          {/* 7. Manager Approval Actions */}
          <ManagerApproval
            recommendedPlan={recommendedPlan}
            onModifyClick={handleModifyClick}
            onPlanApproved={onPlanApproved}
          />
        </div>
      )}
    </section>
  );
}

export default RecoveryAnalysis;
