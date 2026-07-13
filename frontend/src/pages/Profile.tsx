import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { User as UserIcon, Mail, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  
  // Password updates
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await api.put("/users/me", {
        full_name: fullName,
        email: email,
      });

      updateUser({
        full_name: response.data.full_name,
        email: response.data.email,
      });

      setStatusMessage({ type: "success", text: "Profile details updated successfully!" });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to update profile details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // For verification, we can update password on PUT /users/me by passing password key
      await api.put("/users/me", {
        password: newPassword,
      });

      setStatusMessage({
        type: "success",
        text: "Password updated successfully! Logging you out in 2 seconds...",
      });

      // Clear states
      setNewPassword("");
      setConfirmPassword("");

      // Log out user as security protocol for password change
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to change password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal profile and account credentials
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-semibold
            ${statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
        >
          {statusMessage.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {statusMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Card Summary */}
        <div className="md:col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-2xl uppercase mb-4 shadow-inner">
            {user?.full_name?.substring(0, 2) || user?.email.substring(0, 2) || "VI"}
          </div>
          <h3 className="font-bold text-lg leading-tight">{user?.full_name || "Violet User"}</h3>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-full">{user?.email}</p>
          <div className="w-full border-t border-border/80 my-4" />
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Account Status</p>
          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
            Active
          </span>
        </div>

        {/* Form Editor Columns */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Details Form */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base mb-4">Profile Information</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                      <UserIcon size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                Save Changes
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                Update Password
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
