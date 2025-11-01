import React, { useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

const Notification = ({ message, type = "info", onClose }) => {
  if (!message) return null;

  const bgColor = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
    warning: "bg-yellow-100 text-yellow-800",
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertTriangle,
    info: Info,
    warning: AlertTriangle,
  }[type];

  // Auto-close after 3.5s
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-5 right-5 flex items-center max-w-sm w-full p-4 rounded-lg shadow-lg ${bgColor} space-x-3`}>
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
        <X className="w-4 h-4"/>
      </button>
    </div>
  );
};

export default Notification;
