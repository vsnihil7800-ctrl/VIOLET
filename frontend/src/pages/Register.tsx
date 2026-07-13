import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { User, Mail, Lock, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Register User
      await api.post("/auth/register", {
        email,
        full_name: fullName,
        password,
      });

      // 2. Perform Automatic Login for Premium UX
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const loginRes = await api.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token, refresh_token } = loginRes.data;

      // 3. Fetch Profile Info
      const profileRes = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      setAuth(access_token, refresh_token, profileRes.data);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Failed to create account. Please check your data."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background relative px-4 overflow-hidden">
      {/* Abstract background blobs */}
      <div className="absolute top-1/4 -left-16 w-72 h-72 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full bg-accent/10 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/40 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl shadow-black/10 overflow-hidden relative z-10 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent shadow-md shadow-primary/20 mb-4 animate-pulse-slow">
            <Sparkles className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Get started with your personal space today
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-accent font-semibold transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
