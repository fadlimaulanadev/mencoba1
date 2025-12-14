import { ReactNode } from 'react';
import { Home, ClipboardCheck, FileText, Calendar, Users, Activity, User, LogOut, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

interface LayoutProps {
  children: ReactNode;
  role: 'admin' | 'pembimbing' | 'mahasiswa';
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  user?: { name: string; role: string } | null;
}

export function Layout({ children, role, currentPage, onPageChange, onLogout, user }: LayoutProps) {
  const getMenuItems = () => {
    // Menu untuk mahasiswa (termasuk absensi)
    if (role === 'mahasiswa') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'absensi', label: 'Absensi', icon: ClipboardCheck },
        { id: 'izin', label: 'Izin/Sakit', icon: Calendar },
        { id: 'laporan', label: 'Laporan', icon: FileText },
        { id: 'profil', label: 'Profil', icon: User },
      ];
    }

    // Menu untuk admin (tanpa absensi, dengan manajemen user dan log)
    if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'izin', label: 'Izin/Sakit', icon: Calendar },
        { id: 'laporan', label: 'Laporan', icon: FileText },
        { id: 'manajemen', label: 'Manajemen User', icon: Users },
        { id: 'log', label: 'Log Aktivitas', icon: Activity },
        { id: 'profil', label: 'Profil', icon: User },
      ];
    }

    // Menu untuk pembimbing (tanpa absensi)
    return [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'izin', label: 'Izin/Sakit', icon: Calendar },
      { id: 'laporan', label: 'Laporan', icon: FileText },
      { id: 'profil', label: 'Profil', icon: User },
    ];
  };

  const menuItems = getMenuItems();

  const Sidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`${isMobile ? 'min-h-full' : 'w-64 h-screen'} bg-sidebar text-sidebar-foreground flex flex-col`}>
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary p-2 rounded">
            <ClipboardCheck className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-medium">PT PIM</h2>
            <p className="text-xs text-sidebar-foreground/70">Sistem Absensi</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'hover:bg-sidebar-accent text-sidebar-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent rounded-lg p-4 mb-4">
          <p className="text-sm">
            <span className="font-medium block">Role:</span>
            <span className="text-sidebar-foreground/80 capitalize">{role}</span>
          </p>
        </div>
        <Button
          onClick={onLogout}
          variant="destructive"
          className="w-full justify-start gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 overflow-y-auto bg-sidebar">
                <Sidebar isMobile />
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-foreground capitalize">
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground">
                PT Pupuk Iskandar Muda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium truncate max-w-[120px] sm:max-w-none">
                {user?.name || (role === 'mahasiswa' ? 'Mahasiswa' : role === 'pembimbing' ? 'Pembimbing' : 'Admin')}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border px-6 py-3">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <p>© 2025 PT Pupuk Iskandar Muda</p>
            <p>Version 1.0.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
