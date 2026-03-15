import React from 'react';
import { Home, BarChart2, Settings, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'ホーム', path: '/' },
    { icon: BarChart2, label: '振り返り', path: '/stats' },
    { icon: Settings, label: '設定', path: '/settings' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Do It Now
        </h1>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 px-4 pt-4 overflow-x-hidden">
        {children}
      </main>

      {/* Floating Action Button (FAB) */}
      {!location.pathname.startsWith('/task/') && (
        <Link
          to="/add"
          className="fixed right-6 bottom-24 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20"
        >
          <Plus className="w-8 h-8" />
        </Link>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-6 py-3 flex items-center justify-between z-10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-primary/10' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
