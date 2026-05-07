"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import { Bell } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  articleId?: string;
}

interface NotificationContextType {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const { token, isAuthenticated } = useAuth();

  const refreshUnread = useCallback(async () => {
    if (!token || !isAuthenticated) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data: Notification[] = await res.json();
        const unread = data.filter(n => !n.read);
        setUnreadCount(unread.length);

        // Real-time toast for NEW notifications
        if (data.length > 0) {
          const newest = data[0];
          
          // Only toast if it's unread AND we haven't seen it in this session's latest check
          if (!newest.read && newest.id !== lastNotificationId) {
            if (lastNotificationId !== null) { // Skip the very first load's toast
                toast.info(
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Bell className="w-4 h-4 text-primary" />
                            {newest.title}
                        </div>
                        <p className="text-xs opacity-90">{newest.message}</p>
                    </div>,
                    {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    }
                );
            }
            setLastNotificationId(newest.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to poll notifications:", err);
    }
  }, [token, isAuthenticated, lastNotificationId]);

  useEffect(() => {
    if (isAuthenticated && token) {
      refreshUnread();
      const interval = setInterval(refreshUnread, 10000); // Check every 10 seconds globally
      return () => clearInterval(interval);
    } else {
        setUnreadCount(0);
        setLastNotificationId(null);
    }
  }, [isAuthenticated, token, refreshUnread]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
