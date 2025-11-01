import React, { useEffect, useState } from "react";
import { getUserNotifications } from "../../services/api";

export const NotificationPanel = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;
    getUserNotifications(userId)
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Failed to fetch notifications:", err));
  }, [userId]);

  return (
    <div>
      <h3>Notifications</h3>
      <ul>
        {notifications.map(n => (
          <li key={n.notification_id}>
            <strong>{n.title}:</strong> {n.message} {n.read_status ? "(Read)" : "(Unread)"}
          </li>
        ))}
      </ul>
    </div>
  );
};
