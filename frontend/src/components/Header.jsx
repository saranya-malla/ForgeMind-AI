import NotificationCenter from "./NotificationCenter";

export function Header({
  activePlanId = null,
  currentStep = 1,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onMarkRead,
}) {
  const steps = [
    { num: 1, label: "Detect" },
    { num: 2, label: "Analyze" },
    { num: 3, label: "Compare" },
    { num: 4, label: "Recommend" },
    { num: 5, label: "Approve" },
    { num: 6, label: "Activate" },
  ];

  return (
    <header className="app-header">
      <div className="header-main-row">
        <div className="header-brand">
          <div className="title-row">
            <h1 className="product-title">ForgeMind AI</h1>

            <span className="badge badge-domain">Industry 5.0</span>

            {activePlanId && (
              <span className="badge badge-header-active">
                ● Approved Recovery Plan Active: {activePlanId}
              </span>
            )}
          </div>

          <p className="product-subtitle">
            Adaptive Production Planning & Disruption Management
          </p>
        </div>

        <div className="header-meta">
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={onMarkAllRead}
            onMarkRead={onMarkRead}
          />

          <span className="team-tag">
            Team: <strong>NexForge</strong>
          </span>
        </div>
      </div>

      {/* Visual Workflow Pipeline Stepper */}
      <div className="workflow-stepper">
        <span className="stepper-title">Workflow:</span>

        <div className="stepper-track">
          {steps.map((s, idx) => {
            const isCompleted = s.num < currentStep;
            const isCurrent = s.num === currentStep;

            return (
              <div key={s.num} className="stepper-item-group">
                <div
                  className={`stepper-step ${
                    isCurrent
                      ? "step-current"
                      : isCompleted
                      ? "step-completed"
                      : "step-pending"
                  }`}
                >
                  <span className="step-badge">
                    {isCompleted ? "✓" : s.num}
                  </span>

                  <span className="step-text">{s.label}</span>
                </div>

                {idx < steps.length - 1 && (
                  <span
                    className={`stepper-arrow ${
                      isCompleted ? "arrow-completed" : ""
                    }`}
                  >
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default Header;