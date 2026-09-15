import { useState } from "react";

function NotificationCenter({
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onMarkRead,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open notifications"
        title="Notifications"
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <h3>Notifications</h3>

              {unreadCount > 0 && (
                <span>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                className="mark-all-read"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">✓</div>
                <p>No notifications</p>
                <span>System alerts will appear here.</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`notification-item ${
                    notification.read
                      ? "notification-read"
                      : "notification-unread"
                  }`}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                >
                  <div
                    className={`notification-icon notification-${notification.type}`}
                  >
                    {notification.type === "danger" && "!"}
                    {notification.type === "warning" && "⚠"}
                    {notification.type === "success" && "✓"}
                    {notification.type === "info" && "i"}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <strong>{notification.title}</strong>

                      {!notification.read && (
                        <span className="notification-dot" />
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <span className="notification-time">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;