import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BUDGET_CATEGORIES = [
  "All",
  "Food & Dining",
  "Utilities & Bills",
  "Rent & Mortgage",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Others",
];

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(BUDGET_CATEGORIES[0]);
      setAmount("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    const now = new Date();
    const payload = {
      category,
      limit_amount: parseFloat(amount),
      month: now.getMonth() + 1, // 1-indexed (1-12)
      year: now.getFullYear(),
    };

    try {
      await api.post("/finance/budgets", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while setting the budget."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="font-bold text-lg">Configure Budget Limit</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Category Scope
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
            >
              {BUDGET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "Overall Budget (All Categories)" : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Monthly Limit Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500.00"
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3 border border-border/40">
            This budget limit will apply to the current calendar month:{" "}
            <strong>
              {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}
            </strong>
            .
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-border hover:bg-secondary rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center gap-1.5 shadow"
            >
              {isLoading ? <Loader2 className="animate-spin" size={14} /> : null}
              Save Budget
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
