import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password-request", { email });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong. Please check your email and network."
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
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>

        {isSubmitted ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 mb-4">
              <CheckCircle size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Check your connection</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              If the account exists, we have generated a mock password reset link in the backend console.
            </p>
            <p className="text-xs text-muted-foreground bg-secondary/60 border border-border/85 rounded-lg p-3 mt-4 text-left font-mono">
              Note: For local development, check the FastAPI backend terminal logs to click the generated reset URL.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Enter your email address and we'll generate a reset link in the console log.
              </p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending link...
                  </>
                ) : (
                  "Generate Reset Link"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
