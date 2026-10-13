import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { HeartHandshake, Sparkles, LogOut, User, ShieldCheck } from 'lucide-react';

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, logout } = useAuth();

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
