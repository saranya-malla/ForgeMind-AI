import MachineCard from "./MachineCard";

export function MachineStatus({ machines, disruptedMachineId = null }) {
  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Machine Status</h2>
        <span className="section-count">{machines.length} Total Units</span>
      </div>
      <div className="machines-grid">
        {machines.map((m) => (
          <MachineCard
            key={m.id}
            machine={m}
            isDisrupted={m.id === disruptedMachineId}
          />
        ))}
      </div>
    </section>
  );
}

export default MachineStatus;
