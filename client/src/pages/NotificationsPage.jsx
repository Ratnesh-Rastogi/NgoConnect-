import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  Bell,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Check,
  AlertTriangle,
  Package,
  RefreshCw
} from 'lucide-react';

export const NotificationsPage = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [updatingId, setUpdatingId] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = filter === 'unread' ? { unread: 'true' } : {};
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkOneRead = async (id) => {
    setUpdatingId(id);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
    } catch (err) {
      alert(`Failed to mark all as read: ${err.message}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NGO_APPROVED':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'NGO_REJECTED':
      case 'NGO_SUSPENDED':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'TRANSFER_IN_TRANSIT':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'TRANSFER_RECEIVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'NEW_DONATION':
      case 'DONATION_RECORDED':
        return <HeartHandshake className="w-5 h-5 text-purple-600" />;
      case 'RESOURCE_CLAIMED':
      case 'CLAIM_RECORDED':
        return <Package className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Bell className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time updates on your donations, resource claims, verification status, and deliveries
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`pb-3 border-b-2 transition-all ${
              filter === 'all'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              filter === 'unread'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Bell className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No notifications found.</p>
            <p className="text-xs text-gray-400">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'You have not received any notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const isUnread = !n.readAt;

              return (
                <div
                  key={n.id}
                  className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                    isUnread ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 max-w-2xl">
                    <div className="p-2.5 rounded-xl bg-gray-100/80 shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-bold text-gray-900">{n.title}</h3>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {new Date(n.createdAt).toLocaleDateString()} at{' '}
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkOneRead(n.id)}
                      disabled={updatingId === n.id}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
