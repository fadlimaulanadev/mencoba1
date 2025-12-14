import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { AttendancePage } from "./components/AttendancePage";
import { LeavePage } from "./components/LeavePage";
import { ReportPage } from "./components/ReportPage";
import { UserManagement } from "./components/UserManagement";
import { ProfilePage } from "./components/ProfilePage";
import { ActivityLog } from "./components/ActivityLog";
import { Toaster } from "./components/ui/sonner";

type UserRole = "admin" | "pembimbing" | "mahasiswa";
type Page =
  | "dashboard"
  | "absensi"
  | "izin"
  | "laporan"
  | "manajemen"
  | "log"
  | "profil";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] =
    useState<UserRole>("mahasiswa");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on app start
  useEffect(() => {
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUserRole(session.role);
        setCurrentUser(session.user);
        setCurrentPage(session.currentPage || 'dashboard');
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem('userSession');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (role: UserRole, user?: any) => {
    setUserRole(role);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
    
    // Save session to localStorage
    const session = {
      role,
      user,
      currentPage: "dashboard"
    };
    localStorage.setItem('userSession', JSON.stringify(session));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage("dashboard");
    
    // Clear session from localStorage
    localStorage.removeItem('userSession');
  };

  // Save current page to localStorage when it changes
  useEffect(() => {
    if (isLoggedIn) {
      const savedSession = localStorage.getItem('userSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          session.currentPage = currentPage;
          localStorage.setItem('userSession', JSON.stringify(session));
        } catch (error) {
          console.error('Error saving page:', error);
        }
      }
    }
  }, [currentPage, isLoggedIn]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard role={userRole} user={currentUser} />;
      case "absensi":
        // Halaman absensi hanya untuk mahasiswa
        return userRole === "mahasiswa" ? (
          <AttendancePage user={currentUser} />
        ) : (
          <Dashboard role={userRole} user={currentUser} />
        );
      case "izin":
        return <LeavePage role={userRole} />;
      case "laporan":
        return <ReportPage role={userRole} />;
      case "manajemen":
        return userRole === "admin" ? (
          <UserManagement />
        ) : (
          <Dashboard role={userRole} />
        );
      case "log":
        return userRole === "admin" ? (
          <ActivityLog />
        ) : (
          <Dashboard role={userRole} />
        );
      case "profil":
        return <ProfilePage role={userRole} />;
      default:
        return <Dashboard role={userRole} />;
    }
  };

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout
        role={userRole}
        currentPage={currentPage}
        onPageChange={(page) => {
          setCurrentPage(page as Page);
        }}
        onLogout={handleLogout}
        user={currentUser}
      >
        {renderPage()}
      </Layout>

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </>
  );
}