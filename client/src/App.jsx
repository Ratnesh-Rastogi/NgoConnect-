import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DonorDashboard } from './pages/DonorDashboard.jsx';
import { NgoDashboard } from './pages/NgoDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { AiRecommendationsPage } from './pages/AiRecommendationsPage.jsx';
import { NgosDirectoryPage } from './pages/NgosDirectoryPage.jsx';
import { BrowseResourcesPage } from './pages/BrowseResourcesPage.jsx';
import { CreateResourcePage } from './pages/CreateResourcePage.jsx';
import { MyResourcesPage } from './pages/MyResourcesPage.jsx';
import { HeartHandshake } from 'lucide-react';

const MainLayout = () => {
  const [currentView, setCurrentView] = useState('home');
  const { user } = useAuth();

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomePage onNavigate={setCurrentView} />;
      case 'browse-resources':
        return <BrowseResourcesPage onNavigate={setCurrentView} />;
      case 'create-resource':
        return <CreateResourcePage onNavigate={setCurrentView} />;
      case 'my-resources':
        return <MyResourcesPage onNavigate={setCurrentView} />;
      case 'ngos':
        return <NgosDirectoryPage />;
      case 'ai-matcher':
        return <AiRecommendationsPage onNavigate={setCurrentView} />;
      case 'login':
        return <LoginPage onNavigate={setCurrentView} />;
      case 'register':
        return <RegisterPage onNavigate={setCurrentView} />;
      case 'donor-dashboard':
        return <DonorDashboard onNavigate={setCurrentView} />;
      case 'ngo-dashboard':
        return <NgoDashboard />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      default:
        return <HomePage onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-gray-900">NGOConnect AI</span>
            <span>— Free Community Resource Allocation</span>
          </div>
          <div className="text-center sm:text-right">
            <p>Core Giving is 100% Free. Never Paywalled.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Built with React, Express, Prisma & PostgreSQL</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
