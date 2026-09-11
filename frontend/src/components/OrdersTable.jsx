export function OrdersTable({ orders, affectedOrderIds = [] }) {
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
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Production Orders</h2>
        <span className="section-count">{orders.length} Active Orders</span>
      </div>
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Priority</th>
              <th>Quantity</th>
              <th>Deadline</th>
              {affectedOrderIds.length > 0 && <th>Simulation Impact</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isAffected = affectedOrderIds.includes(o.id);
              return (
                <tr key={o.id} className={isAffected ? "row-affected" : ""}>
                  <td className="font-mono font-bold">{o.id}</td>
                  <td>{o.product}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(o.priority)}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td>{o.quantity} units</td>
                  <td className="font-mono">{o.deadline}</td>
                  {affectedOrderIds.length > 0 && (
                    <td>
                      {isAffected ? (
                        <span className="badge badge-impact-delayed">
                          At Risk
                        </span>
                      ) : (
                        <span className="badge badge-impact-safe">
                          On Track
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default OrdersTable;
