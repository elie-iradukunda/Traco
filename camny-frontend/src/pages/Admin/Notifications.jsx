import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { getAllDrivers, sendNotification } from "../../services/api";
import { getUserNotifications } from "../../services/api";

const NotificationsAdmin = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getAllDrivers().then(res => setDrivers(res.data || [])).catch(console.error);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedUser) return alert("Select recipient");
    try {
      await sendNotification({ user_id: selectedUser, title, message });
      alert("Notification sent");
      // reload notifications for selected user
      loadNotifications(selectedUser);
      setTitle(""); setMessage("");
    } catch (err) { console.error(err); alert("Failed to send"); }
  };

  const loadNotifications = (userId) => {
    getUserNotifications(userId).then(res => setNotifications(res.data || [])).catch(console.error);
  };

  return (
    <AdminLayout>
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>

      <form onSubmit={handleSend} className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={selectedUser || ""} onChange={e => { setSelectedUser(Number(e.target.value)); loadNotifications(Number(e.target.value)); }} className="border p-2 rounded">
            <option value="">Select recipient (driver)</option>
            {drivers.map(d => <option key={d.driver_id} value={d.user_id || d.driver_id}>{d.full_name}</option>)}
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="border p-2 rounded" />
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" className="border p-2 rounded" />
        </div>
        <div className="mt-3">
          <button className="bg-sky-600 text-white px-3 py-1 rounded">Send</button>
        </div>
      </form>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Recent notifications</h3>
        {notifications.length === 0 ? <p className="text-sm text-gray-500">No notifications</p> : (
          <ul className="space-y-2">
            {notifications.map(n => (
              <li key={n.notification_id} className="border rounded p-2">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-sm text-gray-700">{n.message}</div>
                <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificationsAdmin;
