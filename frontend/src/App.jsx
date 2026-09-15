import { useEffect, useState } from "react";
import Header from "./components/Header";
import MachineStatus from "./components/MachineStatus";
import OrdersTable from "./components/OrdersTable";
import DisruptionSimulator from "./components/DisruptionSimulator";
import RecoveryAnalysis from "./components/RecoveryAnalysis";
import ActiveScheduleView from "./components/ActiveScheduleView";
import {
  fetchMachines,
  fetchOrders,
  generateRecoveryPlans,
  fetchProductionSchedule,
} from "./api/api";
import "./App.css";

function App() {
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Disruption state
  const [simulationResult, setSimulationResult] = useState(null);
  const [disruptedMachineId, setDisruptedMachineId] = useState(null);
  const [affectedOrderIds, setAffectedOrderIds] = useState([]);

  // Recovery analysis candidate state (proposals)
  const [recoveryData, setRecoveryData] = useState(null);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);

  // Active production schedule state (currently manager-approved)
  const [activeSchedule, setActiveSchedule] = useState(null);

  // Notification state
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("forgemind_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // Persist notifications in browser
  useEffect(() => {
    localStorage.setItem(
      "forgemind_notifications",
      JSON.stringify(notifications)
    );
  }, [notifications]);

  const addNotification = (notification) => {
    setNotifications((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          read: false,
          ...notification,
        },
        ...prev,
      ].slice(0, 20)
    );
  };

  const handleMarkRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [machinesData, ordersData, scheduleData] = await Promise.all([
          fetchMachines(),
          fetchOrders(),
          fetchProductionSchedule().catch(() => null),
        ]);

        setMachines(machinesData);
        setOrders(ordersData);

        if (scheduleData && scheduleData.status === "active") {
          setActiveSchedule(scheduleData);
        }
      } catch (err) {
        setError(
          err.message ||
            "Unable to connect to the ForgeMind AI backend. Please ensure the server is running on http://localhost:8000."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDisruptionSimulated = (simResult) => {
    setSimulationResult(simResult);

    if (simResult?.disruption?.machine) {
      setDisruptedMachineId(simResult.disruption.machine);
    }

    if (simResult?.affected_orders) {
      setAffectedOrderIds(simResult.affected_orders);
    }

    // Reset candidate proposals on new simulation,
    // but PRESERVE activeSchedule
    setRecoveryData(null);
    setRecoveryError(null);

    // 🔴 Notification: Disruption detected
    const machineId = simResult?.disruption?.machine || "Unknown machine";
    const duration = simResult?.disruption?.duration_minutes ?? 180;
    const affectedCount = simResult?.affected_orders?.length || 0;

    addNotification({
      type: "danger",
      title: "New Disruption Alert",
      message: `High-severity breakdown on ${machineId}. Recovery time: ${duration} minutes. ${affectedCount} production orders affected.`,
    });
  };

  const handleGenerateRecoveryPlans = async (
    weights = {
      deadline_weight: 0.5,
      cost_weight: 0.3,
      utilization_weight: 0.2,
    }
  ) => {
    setIsGeneratingPlans(true);
    setRecoveryError(null);

    try {
      // Updates candidate recommendations only;
      // does NOT modify activeSchedule
      const data = await generateRecoveryPlans(weights);
      setRecoveryData(data);

      // 🟡 Notification: Recovery plans ready
      const recommendedPlan =
        data?.recommended_plan_id ||
        data?.recommendation?.plan_id ||
        data?.recommended_plan?.plan_id ||
        "Review recommended plan";

      addNotification({
        type: "warning",
        title: "Recovery Decision Required",
        message: `Three recovery plans are ready for manager review. Recommended: ${recommendedPlan}.`,
      });
    } catch (err) {
      setRecoveryError(err.message || "Failed to generate recovery plans.");
    } finally {
      setIsGeneratingPlans(false);
    }
  };

  const handlePlanApproved = async () => {
    try {
      const scheduleData = await fetchProductionSchedule();
      setActiveSchedule(scheduleData);

      // 🟢 Notification: Recovery plan activated
      const approvedPlan =
        scheduleData?.approved_plan_id ||
        scheduleData?.plan_id ||
        "Approved recovery plan";

      addNotification({
        type: "success",
        title: "Recovery Plan Activated",
        message: `${approvedPlan} is now active. Production scheduling has been updated.`,
      });
    } catch (err) {
      console.error("Failed to fetch updated production schedule:", err);
    }
  };

  const isApprovedPlanActive = activeSchedule?.status === "active";

  const currentStep = isApprovedPlanActive
    ? 6
    : recoveryData
    ? 5
    : simulationResult
    ? 2
    : 1;

  return (
    <div className="app-layout">
      <Header
        activePlanId={
          isApprovedPlanActive ? activeSchedule.approved_plan_id : null
        }
        currentStep={currentStep}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
      />

      <main className="dashboard-content">
        {loading && (
          <div className="state-panel loading-panel">
            <div className="spinner"></div>
            <p>Connecting to ForgeMind AI Factory Controller...</p>
          </div>
        )}

        {error && !loading && (
          <div className="state-panel error-panel">
            <div className="error-icon">⚠️</div>
            <h3>Backend Offline or Unreachable</h3>
            <p>{error}</p>
            <p className="error-hint">
              Start the backend with:{" "}
              <code>uvicorn backend.main:app --port 8000</code>
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="dashboard-grid">
            {/* Active Approved Schedule Banner */}
            {isApprovedPlanActive && (
              <div className="active-plan-persistent-alert">
                <div className="alert-content">
                  <span className="live-pulse-dot"></span>
                  <strong>Approved Recovery Plan Active:</strong>{" "}
                  <span className="font-mono text-accent">
                    {activeSchedule.approved_plan_id}
                  </span>{" "}
                  (
                  {activeSchedule.plan_name ||
                    activeSchedule.plan_details?.plan_name}
                  )
                  <span className="alert-detail">
                    Shop-floor scheduling synchronized in-memory.
                  </span>
                </div>
              </div>
            )}

            <MachineStatus
              machines={machines}
              disruptedMachineId={disruptedMachineId}
            />

            <DisruptionSimulator
              machines={machines}
              onDisruptionSimulated={handleDisruptionSimulated}
            />

            {/* Prominent Action Banner after Disruption is Simulated */}
            {simulationResult && !recoveryData && (
              <div className="action-callout-banner">
                <div className="callout-text">
                  <h3>
                    Disruption Active on{" "}
                    {simulationResult.disruption?.machine}
                  </h3>

                  <p>
                    {simulationResult.affected_orders?.length || 0} downstream
                    production orders impacted. Engage the multi-objective
                    recovery engine to evaluate mitigation plans.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateRecoveryPlans()}
                  disabled={isGeneratingPlans}
                  className="btn btn-primary btn-generate-plans"
                >
                  {isGeneratingPlans
                    ? "Simulating Recovery..."
                    : "Generate Recovery Plans"}
                </button>
              </div>
            )}

            {/* Recovery Analysis Area */}
            {simulationResult && (
              <RecoveryAnalysis
                disruption={simulationResult.disruption}
                affectedOrders={affectedOrderIds}
                recoveryData={recoveryData}
                onApplyPriorities={handleGenerateRecoveryPlans}
                onPlanApproved={handlePlanApproved}
                isLoading={isGeneratingPlans}
                error={recoveryError}
              />
            )}

            {/* Active Approved Production Schedule View */}
            {isApprovedPlanActive && (
              <ActiveScheduleView activeSchedule={activeSchedule} />
            )}

            <OrdersTable
              orders={orders}
              affectedOrderIds={affectedOrderIds}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;