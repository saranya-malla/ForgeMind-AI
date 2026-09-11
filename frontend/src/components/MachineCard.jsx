export function MachineCard({ machine, isDisrupted = false }) {
  const displayStatus = isDisrupted ? "disrupted" : machine.status;
  const isAvailable = displayStatus === "available";

  return (
    <div className={`machine-card ${isDisrupted ? "machine-card-disrupted" : ""}`}>
      <div className="machine-card-header">
        <span className="machine-id">{machine.id}</span>
        <span
          className={`status-pill ${
            isAvailable ? "status-available" : "status-unavailable"
          }`}
        >
          <span className="status-dot"></span>
          {displayStatus}
        </span>
      </div>
      <h3 className="machine-name">{machine.name}</h3>
      <div className="machine-meta">
        <span className="meta-label">Process:</span>
        <span className="meta-value">{machine.process}</span>
      </div>
    </div>
  );
}

export default MachineCard;
