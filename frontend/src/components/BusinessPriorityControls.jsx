import { useState } from "react";

export function BusinessPriorityControls({
  currentWeights = { deadline_weight: 0.50, cost_weight: 0.30, utilization_weight: 0.20 },
  onApplyPriorities,
  isLoading = false,
}) {
  const [deadline, setDeadline] = useState(Math.round((currentWeights.deadline_weight ?? 0.50) * 100));
  const [cost, setCost] = useState(Math.round((currentWeights.cost_weight ?? 0.30) * 100));
  const [utilization, setUtilization] = useState(Math.round((currentWeights.utilization_weight ?? 0.20) * 100));

  // Helper to maintain sum = 100 when adjusting one slider
  const handleSliderChange = (changed, newValue) => {
    const val = Math.max(0, Math.min(100, Number(newValue)));
    const remaining = 100 - val;

    if (changed === "deadline") {
      const otherSum = cost + utilization;
      let newCost, newUtil;
      if (otherSum > 0) {
        newCost = Math.round((remaining * cost) / otherSum);
        newUtil = remaining - newCost;
      } else {
        newCost = Math.floor(remaining / 2);
        newUtil = remaining - newCost;
      }
      setDeadline(val);
      setCost(newCost);
      setUtilization(newUtil);
    } else if (changed === "cost") {
      const otherSum = deadline + utilization;
      let newDead, newUtil;
      if (otherSum > 0) {
        newDead = Math.round((remaining * deadline) / otherSum);
        newUtil = remaining - newDead;
      } else {
        newDead = Math.floor(remaining / 2);
        newUtil = remaining - newDead;
      }
      setCost(val);
      setDeadline(newDead);
      setUtilization(newUtil);
    } else if (changed === "utilization") {
      const otherSum = deadline + cost;
      let newDead, newCost;
      if (otherSum > 0) {
        newDead = Math.round((remaining * deadline) / otherSum);
        newCost = remaining - newDead;
      } else {
        newDead = Math.floor(remaining / 2);
        newCost = remaining - newDead;
      }
      setUtilization(val);
      setDeadline(newDead);
      setCost(newCost);
    }
  };

  const applyPreset = (d, c, u) => {
    setDeadline(d);
    setCost(c);
    setUtilization(u);
  };

  const handleApply = () => {
    if (onApplyPriorities) {
      onApplyPriorities({
        deadline_weight: Number((deadline / 100).toFixed(2)),
        cost_weight: Number((cost / 100).toFixed(2)),
        utilization_weight: Number((utilization / 100).toFixed(2)),
      });
    }
  };

  const total = deadline + cost + utilization;

  return (
    <div className="priority-controls-card">
      <div className="controls-header">
        <div>
          <h3>Business Priority Tuning</h3>
          <p className="controls-sub">
            Adjust strategic business trade-offs. The recommendation adapts dynamically based on your criteria.
          </p>
        </div>
        <div className="sum-indicator">
          Total: <strong className={total === 100 ? "text-success" : "text-danger"}>{total}%</strong>
        </div>
      </div>

      <div className="presets-row">
        <span className="presets-label">Quick Presets:</span>
        <button
          type="button"
          onClick={() => applyPreset(50, 30, 20)}
          className="btn-preset"
        >
          Balanced (50 / 30 / 20)
        </button>
        <button
          type="button"
          onClick={() => applyPreset(10, 80, 10)}
          className="btn-preset"
        >
          Cost Focus (10 / 80 / 10)
        </button>
        <button
          type="button"
          onClick={() => applyPreset(80, 10, 10)}
          className="btn-preset"
        >
          Deadline Focus (80 / 10 / 10)
        </button>
      </div>

      <div className="sliders-grid">
        <div className="slider-item">
          <div className="slider-label-row">
            <span className="slider-title">Deadline Priority</span>
            <span className="slider-value font-mono">{deadline}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={deadline}
            onChange={(e) => handleSliderChange("deadline", e.target.value)}
            className="slider-input slider-deadline"
          />
        </div>

        <div className="slider-item">
          <div className="slider-label-row">
            <span className="slider-title">Cost Minimization Priority</span>
            <span className="slider-value font-mono">{cost}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={cost}
            onChange={(e) => handleSliderChange("cost", e.target.value)}
            className="slider-input slider-cost"
          />
        </div>

        <div className="slider-item">
          <div className="slider-label-row">
            <span className="slider-title">Resource Utilization Priority</span>
            <span className="slider-value font-mono">{utilization}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={utilization}
            onChange={(e) => handleSliderChange("utilization", e.target.value)}
            className="slider-input slider-util"
          />
        </div>
      </div>

      <div className="controls-footer">
        <button
          type="button"
          onClick={handleApply}
          disabled={isLoading || total !== 100}
          className="btn btn-primary btn-apply-priorities"
        >
          {isLoading ? "Recalculating..." : "Apply Priorities"}
        </button>
      </div>
    </div>
  );
}

export default BusinessPriorityControls;
