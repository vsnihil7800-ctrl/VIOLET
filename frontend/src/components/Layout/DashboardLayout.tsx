import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../context/ThemeContext";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Dumbbell,
  CheckSquare,
  Calendar,
  FolderLock,
  Sparkles,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { api } from "../../services/api";

export const DashboardLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      logout();
      navigate("/login");
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Finance", path: "/finance", icon: Wallet },
    { name: "Investments", path: "/investments", icon: TrendingUp },
    { name: "Fitness & Nutrition", path: "/fitness", icon: Dumbbell },
    { name: "Productivity", path: "/productivity", icon: CheckSquare },
    { name: "Schedule & Reminders", path: "/schedule", icon: Calendar },
    { name: "Document Vault", path: "/vault", icon: FolderLock },
    { name: "Violet AI Chat", path: "/assistant", icon: Sparkles, highlight: true },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-card border-r border-border transition-all duration-300
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md animate-pulse-slow">
              <span className="text-white font-extrabold text-sm">V</span>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-bold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                VIOLET
              </span>
            )}
          </div>

          {/* Close button for Mobile */}
          <button className="lg:hidden p-1 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileOpen(false)}>
            <X size={20} />
          </button>

          {/* Collapse button for Desktop */}
          <button
            className="hidden lg:flex p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                  ${isActive
                    ? item.highlight
                      ? "bg-gradient-to-r from-primary/25 to-accent/25 text-foreground border-l-4 border-primary"
                      : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                <Icon size={20} className={`${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                {(!isCollapsed || isMobileOpen) && <span>{item.name}</span>}
                
                {/* Tooltip for Collapsed Sidebar */}
                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-16 scale-0 group-hover:scale-100 bg-foreground text-background text-xs rounded py-1.5 px-3.5 pointer-events-none transition-all z-50 whitespace-nowrap shadow-md">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group relative mb-2
              ${currentPath === "/profile" ? "bg-secondary text-foreground" : ""}
            `}
          >
            <UserIcon size={20} />
            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate flex-1">
                <p className="font-semibold text-foreground text-xs truncate">
                  {user?.full_name || "User Profile"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
            {isCollapsed && !isMobileOpen && (
              <div className="absolute left-16 scale-0 group-hover:scale-100 bg-foreground text-background text-xs rounded py-1.5 px-3.5 pointer-events-none transition-all z-50 whitespace-nowrap">
                Profile & Settings
              </div>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all group relative"
          >
            <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
            {(!isCollapsed || isMobileOpen) && <span>Logout</span>}
            {isCollapsed && !isMobileOpen && (
              <div className="absolute left-16 scale-0 group-hover:scale-100 bg-destructive text-white text-xs rounded py-1.5 px-3.5 pointer-events-none transition-all z-50 whitespace-nowrap">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-card/60 backdrop-blur-md border-b border-border z-30 sticky top-0">
          <div className="flex items-center gap-4">
            {/* Hamburger for mobile */}
            <button
              className="lg:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-lg tracking-tight capitalize">
              {currentPath.substring(1).replace("-", " ") || "Home"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>

            {/* Profile Avatar Widget */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                {user?.full_name?.substring(0, 2) || user?.email.substring(0, 2) || "VI"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Window */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/85 backdrop-blur-lg border-t border-border/80 z-40 flex items-center justify-around px-2 pb-safe shadow-lg">
        {[
          { name: "Home", path: "/dashboard", icon: LayoutDashboard },
          { name: "Finance", path: "/finance", icon: Wallet },
          { name: "Fitness", path: "/fitness", icon: Dumbbell },
          { name: "Workspace", path: "/productivity", icon: CheckSquare },
          { name: "AI Chat", path: "/assistant", icon: Sparkles }
        ].map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all
                ${isActive 
                  ? "text-primary scale-110" 
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={18} className={isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
              <span className="text-[9px] font-bold mt-0.5 tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
