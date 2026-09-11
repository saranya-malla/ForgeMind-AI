import { useState } from "react";
import { approvePlan } from "../api/api";

export function ManagerApproval({ recommendedPlan, onModifyClick, onPlanApproved }) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);
  const [isRejected, setIsRejected] = useState(false);
  const [error, setError] = useState(null);

  if (!recommendedPlan) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setIsRejected(false);
    try {
      const res = await approvePlan(recommendedPlan.plan_id);
      setApprovalResult(res);
      if (onPlanApproved) {
        onPlanApproved(res);
      }
    } catch (err) {
      setError(err.message || "Failed to approve recovery plan.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    setIsRejected(true);
    setApprovalResult(null);
    setError(null);
  };

  const handleReset = () => {
    setIsRejected(false);
    setApprovalResult(null);
    setError(null);
  };

  return (
    <div className="manager-approval-card">
      <div className="approval-header">
        <h3>Manager Decision & Execution Control</h3>
        <p className="approval-sub">
          Review the AI-generated recovery scenario and execute production schedule adaptation.
        </p>
      </div>

      {approvalResult && (
        <div className="alert alert-success approval-confirmation">
          <div className="confirmation-badge">✓ APPROVED</div>
          <div className="confirmation-content">
            <h4>Plan {approvalResult.plan_id} Formally Approved</h4>
            <p>{approvalResult.message}</p>
            <span className="confirmation-note">
              Factory schedule synchronization triggered for active shop-floor execution.
            </span>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="alert alert-danger rejection-confirmation">
          <div className="confirmation-badge">✕ REJECTED</div>
          <div className="confirmation-content">
            <h4>Recovery Recommendation Declined</h4>
            <p>
              The current recovery proposal was rejected. The active production schedule remains in effect.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "0.5rem" }}
            >
              Re-evaluate Decision
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <strong>Approval Error:</strong> {error}
        </div>
      )}

      {!approvalResult && !isRejected && (
        <div className="approval-actions">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="btn btn-approve"
          >
            {isApproving ? "Executing Approval..." : `APPROVE PLAN (${recommendedPlan.plan_id})`}
          </button>

          <button
            type="button"
            onClick={onModifyClick}
            className="btn btn-modify"
          >
            MODIFY PLAN (TUNE WEIGHTS)
          </button>

          <button
            type="button"
            onClick={handleReject}
            className="btn btn-reject"
          >
            REJECT
          </button>
        </div>
      )}
    </div>
  );
}

export default ManagerApproval;
