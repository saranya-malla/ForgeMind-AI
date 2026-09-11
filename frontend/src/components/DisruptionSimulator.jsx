import { useState } from "react";
import { simulateDisruption } from "../api/api";

export function DisruptionSimulator({ machines, onDisruptionSimulated }) {
  const [selectedMachine, setSelectedMachine] = useState("M2");
  const [disruptionType, setDisruptionType] = useState("machine_breakdown");
  const [duration, setDuration] = useState("180");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simError, setSimError] = useState(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      // Primary MVP disruption scenario D001
      const result = await simulateDisruption("D001");
      setSimulationResult(result);
      if (onDisruptionSimulated) {
        onDisruptionSimulated(result);
      }
    } catch (err) {
      setSimError(err.message || "Failed to simulate disruption.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <section className="dashboard-section disruption-simulator-section">
      <div className="section-header">
        <h2>Disruption Simulator</h2>
        <span className="section-count">Live Scenario Testing</span>
      </div>

      <div className="simulator-card">
        <div className="simulator-controls">
          <div className="form-group">
            <label htmlFor="machine-select">Target Machine</label>
            <select
              id="machine-select"
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="form-control"
            >
              {machines.length > 0 ? (
                machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} - {m.name} ({m.process})
                  </option>
                ))
              ) : (
                <option value="M2">M2 - DrillPro (Drilling)</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="disruption-type">Disruption Event</label>
            <select
              id="disruption-type"
              value={disruptionType}
              onChange={(e) => setDisruptionType(e.target.value)}
              className="form-control"
            >
              <option value="machine_breakdown">Machine Breakdown</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration-input">Duration (minutes)</label>
            <input
              id="duration-input"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="form-control"
              min="1"
            />
          </div>

          <div className="form-action">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="btn btn-simulate"
            >
              {isSimulating ? "Simulating..." : "Simulate Disruption"}
            </button>
          </div>
        </div>

        {simError && (
          <div className="alert alert-error">
            <strong>Simulation Error:</strong> {simError}
          </div>
        )}

        {simulationResult && (
          <div className="simulation-result-panel">
            <div className="result-header">
              <span className="result-badge">Active Disruption</span>
              <span className="result-id">
                ID: {simulationResult.disruption?.id || "D001"}
              </span>
            </div>

            <div className="result-grid">
              <div className="result-stat">
                <span className="stat-label">Failed Machine</span>
                <span className="stat-value font-mono">
                  {simulationResult.disruption?.machine} (DrillPro)
                </span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Affected Process</span>
                <span className="stat-value">
                  {simulationResult.disruption?.process}
                </span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Downtime Duration</span>
                <span className="stat-value">
                  {simulationResult.disruption?.duration_minutes} minutes
                </span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Impact Severity</span>
                <span className="stat-value severity-high">
                  {simulationResult.disruption?.severity || "High"}
                </span>
              </div>
            </div>

            <div className="affected-orders-box">
              <span className="box-title">Affected Orders Downstream:</span>
              <div className="affected-chips">
                {simulationResult.affected_orders &&
                simulationResult.affected_orders.length > 0 ? (
                  simulationResult.affected_orders.map((oid) => (
                    <span key={oid} className="chip chip-danger">
                      Order {oid}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No orders affected.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default DisruptionSimulator;
