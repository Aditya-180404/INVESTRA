import { useState, useEffect } from 'react';
import { clearSession, getToken, refreshCurrentUser } from './services/api';
import type { User } from './types';
import { Landing } from './components/Landing';
import { Login } from './components/Login';
import { AdminPortal } from './components/AdminPortal';
import { PolicePortal } from './components/PolicePortal';
import { NewFIRWizard } from './components/NewFIRWizard';
import { CaseWorkspace } from './components/CaseWorkspace';
import './App.css';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);

  useEffect(() => {
    let alive = true;

    const hydrateSession = async () => {
      const token = getToken();
      if (!token) {
        if (alive) {
          setCurrentUser(null);
          setIsHydratingSession(false);
        }
        return;
      }

      try {
        const user = await refreshCurrentUser();
        if (alive) {
          setCurrentUser(user);
        }
      } catch {
        if (alive) {
          setCurrentUser(null);
        }
      } finally {
        if (alive) {
          setIsHydratingSession(false);
        }
      }
    };

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      void hydrateSession();
    };

    void hydrateSession();
    window.addEventListener('popstate', handlePopState);

    return () => {
      alive = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const refreshUser = async () => {
    const user = await refreshCurrentUser();
    setCurrentUser(user);
    return user;
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    navigate('/');
  };

  if (isHydratingSession) {
    return (
      <div className="loading-screen card" style={{ maxWidth: '420px', margin: '100px auto', padding: '28px', textAlign: 'center' }}>
        <h3>Loading INVESTRA session…</h3>
        <p className="text-muted">Validating your authentication token with the backend.</p>
      </div>
    );
  }

  // 1. Public Landing Page
  if (currentPath === '/') {
    return <Landing onNavigate={navigate} dashboardPath={currentUser ? (currentUser.role === 'Administrator' ? '/admin/dashboard' : '/police/dashboard') : undefined} />;
  }

  // 2. Auth Routes
  if (currentPath === '/police/login') {
    return (
      <Login
        kind="police"
        onNavigate={navigate}
        onLoginSuccess={refreshUser}
      />
    );
  }

  if (currentPath === '/admin/login') {
    return (
      <Login
        kind="admin"
        onNavigate={navigate}
        onLoginSuccess={refreshUser}
      />
    );
  }

  // If not logged in, redirect to login selection or landing
  if (!currentUser) {
    if (currentPath.startsWith('/admin')) {
      return (
        <Login
          kind="admin"
          onNavigate={navigate}
          onLoginSuccess={refreshUser}
        />
      );
    }
    return (
      <Login
        kind="police"
        onNavigate={navigate}
        onLoginSuccess={refreshUser}
      />
    );
  }

  const isAdmin = currentUser.role === 'Administrator';

  // 3. Administrator Routes
  if (currentPath.startsWith('/admin')) {
    if (!isAdmin) {
      // Forbidden: Police cannot access /admin/*
      return (
        <div className="forbidden-screen card" style={{ maxWidth: '500px', margin: '80px auto', padding: '30px', textAlign: 'center' }}>
          <h2>403 — Administrative Role Required</h2>
          <p className="text-muted">Your police credentials do not permit access to system administration.</p>
          <button className="btn btn-primary" onClick={() => navigate('/police/dashboard')} style={{ marginTop: '16px' }}>
            Go to Police Dashboard
          </button>
        </div>
      );
    }

    const tab = currentPath.replace('/admin/', '').split('/')[0] || 'dashboard';
    return (
      <AdminPortal
        currentTab={tab}
        onNavigate={navigate}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    );
  }

  // 4. Police Officer Routes
  if (currentPath === '/police/cases/new') {
    return (
      <div className="police-layout-wrapper">
        <header className="police-top-navbar">
          <div className="navbar-brand" onClick={() => navigate('/police/dashboard')}>
            <div className="brand-badge police-theme">INVESTRA</div>
            <div className="brand-text"><b>INVESTRA</b><span>CASE INTAKE</span></div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/police/dashboard')}>
            Cancel & Return to Dashboard
          </button>
        </header>
        <main className="police-main-container">
          <NewFIRWizard onNavigate={navigate} />
        </main>
      </div>
    );
  }

  // Specific case workspace route: /police/cases/:id
  const caseMatch = currentPath.match(/^\/police\/cases\/(\d+)/);
  if (caseMatch) {
    const caseId = parseInt(caseMatch[1], 10);
    return (
      <CaseWorkspace
        caseId={caseId}
        onNavigate={navigate}
        currentUser={currentUser}
      />
    );
  }

  if (currentPath === '/police/cases') {
    return (
      <PolicePortal
        currentTab="cases"
        onNavigate={navigate}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    );
  }

  // Default Police Dashboard
  return (
    <PolicePortal
      currentTab="dashboard"
      onNavigate={navigate}
      onLogout={handleLogout}
      currentUser={currentUser}
    />
  );
}
