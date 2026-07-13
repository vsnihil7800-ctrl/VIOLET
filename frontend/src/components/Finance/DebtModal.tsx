import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [type, setType] = useState("owed_to_me"); // "owed_to_me" is default (money owed to user)
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType("owed_to_me");
      setPerson("");
      setAmount("");
      setDescription("");
      setDueDate("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person.trim()) {
      setError("Please specify a person's name");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      type,
      person: person.trim(),
      amount: parseFloat(amount),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };

    try {
      await api.post("/finance/debts", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while saving the debt record."
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
          <h3 className="font-bold text-lg">Add Debt Record</h3>
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
          
          {/* Segmented Type Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Debt Class
            </label>
            <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType("owed_to_me")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${type === "owed_to_me"
                    ? "bg-card text-emerald-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Owed to Me
              </button>
              <button
                type="button"
                onClick={() => setType("owed_by_me")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${type === "owed_by_me"
                    ? "bg-card text-destructive shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                I Owe
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Person */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Contact Person
              </label>
              <input
                type="text"
                required
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch split"
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
            />
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
              Save Record
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
