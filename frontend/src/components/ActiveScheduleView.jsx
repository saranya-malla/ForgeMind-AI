export function ActiveScheduleView({ activeSchedule }) {
  if (!activeSchedule || activeSchedule.status !== "active" || !activeSchedule.schedule) {
    return null;
  }

  const plan = activeSchedule.plan_details || {};
  const weights = activeSchedule.applied_weights || {};
  const orders = activeSchedule.schedule || [];

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "";
    }
  };

  return (
    <section className="dashboard-section active-schedule-section">
      <div className="active-schedule-banner">
        <div className="active-banner-left">
          <div className="active-indicator-row">
            <span className="live-pulse-dot"></span>
            <span className="badge badge-active-plan">
              Approved Recovery Plan Active
            </span>
            <span className="active-plan-tag font-mono">
              {activeSchedule.approved_plan_id}
            </span>
          </div>
          <h2 className="active-plan-title">
            {activeSchedule.plan_name || plan.plan_name || "Production Recovery Schedule"}
          </h2>
          <p className="active-plan-sub">
            The shop-floor controller is executing this approved recovery schedule in-memory.
          </p>
        </div>

        <div className="active-banner-stats">
          <div className="banner-stat-item">
            <span className="stat-name">Extra Cost</span>
            <span className="stat-digit font-mono">${plan.extra_cost ?? 0}</span>
          </div>
          <div className="banner-stat-item">
            <span className="stat-name">Total Delay</span>
            <span className="stat-digit font-mono">{plan.total_delay_minutes ?? 0} min</span>
          </div>
          <div className="banner-stat-item">
            <span className="stat-name">Adherence</span>
            <span className="stat-digit font-mono">{plan.deadline_adherence_percent ?? 0}%</span>
          </div>
          <div className="banner-stat-item">
            <span className="stat-name">Applied Weights</span>
            <span className="stat-weights font-mono">
              D: {Math.round((weights.deadline_weight ?? 0.5) * 100)}% | 
              C: {Math.round((weights.cost_weight ?? 0.3) * 100)}% | 
              U: {Math.round((weights.utilization_weight ?? 0.2) * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="table-responsive" style={{ marginTop: "1.25rem" }}>
        <table className="orders-table active-schedule-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Product</th>
              <th>Priority</th>
              <th>Cutting (M1)</th>
              <th>Drilling Resource</th>
              <th>Assembly (M3)</th>
              <th>Finishing (M4)</th>
              <th>Completion</th>
              <th>Deadline</th>
              <th>Execution Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const stageMap = {};
              (o.stages || []).forEach((s) => {
                stageMap[s.process] = s;
              });

              const cut = stageMap["Cutting"];
              const dril = stageMap["Drilling"];
              const asm = stageMap["Assembly"];
              const fin = stageMap["Finishing"];

              const isAuxDrill = dril?.machine === "M2_AUX_RENTAL";

              return (
                <tr key={o.order_id} className={!o.on_time ? "row-delayed" : ""}>
                  <td className="font-mono font-bold">{o.order_id}</td>
                  <td>{o.product}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(o.priority)}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="font-mono text-muted-val">
                    {cut ? `${cut.start_time} - ${cut.end_time}` : "—"}
                  </td>
                  <td>
                    {dril ? (
                      <div className="drilling-cell">
                        <span
                          className={`machine-tag ${
                            isAuxDrill ? "machine-tag-aux" : "machine-tag-standard"
                          }`}
                        >
                          {dril.machine}
                        </span>
                        <span className="font-mono text-time">
                          {dril.start_time} - {dril.end_time}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="font-mono text-muted-val">
                    {asm ? `${asm.start_time} - ${asm.end_time}` : "—"}
                  </td>
                  <td className="font-mono text-muted-val">
                    {fin ? `${fin.start_time} - ${fin.end_time}` : "—"}
                  </td>
                  <td className="font-mono font-bold text-completion">
                    {o.completion_time}
                  </td>
                  <td className="font-mono text-deadline">{o.deadline}</td>
                  <td>
                    {o.on_time ? (
                      <span className="badge badge-on-time">ON-TIME</span>
                    ) : (
                      <span className="badge badge-late">
                        DELAY (+{o.delay_minutes}m)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ActiveScheduleView;
