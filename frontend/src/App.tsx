import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuthStore } from "./store/authStore";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Finance } from "./pages/Finance";
import { Investments } from "./pages/Investments";
import { Fitness } from "./pages/Fitness";
import { Productivity } from "./pages/Productivity";
import { Schedule } from "./pages/Schedule";
import { Vault } from "./pages/Vault";
import { Assistant } from "./pages/Assistant";
import { DashboardLayout } from "./components/Layout/DashboardLayout";

// Initialize TanStack React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard: Only allow authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Guard: Redirect authenticated users away from auth pages
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.accessToken);
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Protected Workspace Routes inside Dashboard Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              
              {/* Settings redirects to profile page */}
              <Route path="settings" element={<Profile />} />

              {/* Placeholder routes for modules in future phases */}
              <Route path="finance" element={<Finance />} />
              <Route path="investments" element={<Investments />} />
              <Route path="fitness" element={<Fitness />} />
              <Route path="productivity" element={<Productivity />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="vault" element={<Vault />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
