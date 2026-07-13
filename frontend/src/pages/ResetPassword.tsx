import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No token was found in the URL. Please verify the reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Failed to reset password. The link may have expired or is invalid."
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
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 mb-4 animate-bounce">
              <CheckCircle size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Password Reset Complete</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Your password has been successfully updated. You can now log in using your new credentials.
            </p>
            <Link
              to="/login"
              className="mt-6 w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Set new password</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Choose a strong password containing at least 8 characters.
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
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={!token}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm disabled:opacity-50"
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={!token}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-10 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-4 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Resetting password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
