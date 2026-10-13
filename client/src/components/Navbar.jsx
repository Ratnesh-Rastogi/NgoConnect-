import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { StatusBadge } from './StatusBadge.jsx';
import {
  HeartHandshake,
  Sparkles,
  LogOut,
  User,
  ShieldCheck,
  Bell,
  Check,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Poll unread notification count every 30 seconds for logged-in user
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.data.unreadCount || 0);
      } catch (err) {
        // Silently catch polling errors
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Polling every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent notifications when dropdown is opened
  const toggleDropdown = async () => {
    const nextState = !dropdownOpen;
    setDropdownOpen(nextState);

    if (nextState) {
      setLoadingNotifications(true);
      try {
        const res = await api.get('/notifications');
        setRecentNotifications((res.data.data || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to load recent notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Platform Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-gray-900">NGOConnect</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">AI</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Free Resource Sharing Network</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-gray-600">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentView === 'home' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Browse Needs
            </button>
            <button
              onClick={() => setCurrentView('browse-resources')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentView === 'browse-resources' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Available Donations
            </button>
            <button
              onClick={() => setCurrentView('ngos')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentView === 'ngos' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Approved NGOs
            </button>
            <button
              onClick={() => setCurrentView('ai-matcher')}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                currentView === 'ai-matcher' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Matcher</span>
            </button>
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Role-Specific Dashboard Shortcut */}
                {user.role === 'donor' && (
                  <>
                    <button
                      onClick={() => setCurrentView('donor-dashboard')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        currentView === 'donor-dashboard'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      My Donations
                    </button>
                    <button
                      onClick={() => setCurrentView('my-resources')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        currentView === 'my-resources'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      My Listings
                    </button>
                  </>
                )}

                {user.role === 'ngo' && (
                  <>
                    <button
                      onClick={() => setCurrentView('ngo-dashboard')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
                        currentView === 'ngo-dashboard'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <span>NGO Hub</span>
                      {user.ngoProfile && (
                        <StatusBadge status={user.ngoProfile.verificationStatus} />
                      )}
                    </button>
                    <button
                      onClick={() => setCurrentView('my-resources')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        currentView === 'my-resources'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      My Listings
                    </button>
                  </>
                )}

                {user.role === 'admin' && (
                  <button
                    onClick={() => setCurrentView('admin-dashboard')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
                      currentView === 'admin-dashboard'
                        ? 'bg-gray-900 text-white shadow'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </button>
                )}

                {/* Notifications Bell with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl relative transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-900">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {loadingNotifications ? (
                          <div className="py-8 text-center">
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          </div>
                        ) : recentNotifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-400">
                            No notifications yet
                          </div>
                        ) : (
                          recentNotifications.map((n) => {
                            const isUnread = !n.readAt;
                            return (
                              <div
                                key={n.id}
                                className={`p-3 text-xs flex items-start justify-between gap-2 transition-colors ${
                                  isUnread ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="space-y-0.5 max-w-[260px]">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-gray-900">{n.title}</span>
                                    {isUnread && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-600 line-clamp-2">{n.message}</p>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {isUnread && (
                                  <button
                                    onClick={() => handleMarkOneRead(n.id)}
                                    className="text-[10px] text-emerald-700 hover:underline shrink-0 pt-0.5"
                                  >
                                    Read
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setCurrentView('notifications');
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-center space-x-1 w-full"
                        >
                          <span>View all notifications</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Pill */}
                <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{user.role}</p>
                  </div>
                  <button
                    onClick={logout}
                    title="Logout"
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-sm font-medium text-gray-700 hover:text-emerald-700 px-3 py-2 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Join Platform
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
