import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2, UploadCloud, CheckCircle } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
}

const CATEGORIES = [
  "Food & Dining",
  "Utilities & Bills",
  "Rent & Mortgage",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Salary",
  "Investment",
  "Others",
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}) => {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Receipt OCR Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatus("Scanning receipt with AI OCR...");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/ai/scan-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data;
      setAmount(data.amount.toString());
      setDescription(`AI OCR Scan: ${data.merchant} - ${data.description}`);
      setType("expense");
      
      const matchedCategory = CATEGORIES.find(
        (c) => c.toLowerCase().includes(data.category.toLowerCase()) || 
               data.category.toLowerCase().includes(c.toLowerCase())
      );
      if (matchedCategory) {
        setCategory(matchedCategory);
      } else {
        setCategory("Others");
      }
      setScanStatus("Receipt scanned and fields populated successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to scan receipt.");
      setScanStatus(null);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      // Format date to YYYY-MM-DDThh:mm
      const formattedDate = new Date(transaction.date).toISOString().slice(0, 16);
      setDate(formattedDate);
      setDescription(transaction.description || "");
    } else {
      setType("expense");
      setAmount("");
      setCategory(CATEGORIES[0]);
      // Default to current local date/time
      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setDate(localDate.toISOString().slice(0, 16));
      setDescription("");
    }
    setError(null);
  }, [transaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      type,
      category,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      description: description || null,
    };

    try {
      if (transaction) {
        await api.put(`/finance/transactions/${transaction.id}`, payload);
      } else {
        await api.post("/finance/transactions", payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while saving the transaction."
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
          <h3 className="font-bold text-lg">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {/* AI Receipt Scanner */}
        {!transaction && (
          <div className="px-6 pt-4">
            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-border/80 hover:border-primary/50 bg-secondary/15 hover:bg-secondary/25 rounded-xl cursor-pointer transition-all">
              <div className="flex items-center gap-2">
                {isScanning ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <UploadCloud size={14} className="text-muted-foreground" />
                )}
                <span className="text-xs font-bold text-foreground">
                  {isScanning ? "Scanning receipt..." : "Quick AI Receipt OCR Scan"}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleScanReceipt}
                disabled={isScanning}
                accept="image/*"
              />
            </label>
            {scanStatus && (
              <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1 justify-center">
                <CheckCircle size={10} className="fill-emerald-500/10 text-emerald-500" />
                {scanStatus}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Transaction Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${type === "expense"
                    ? "bg-card text-destructive shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${type === "income"
                    ? "bg-card text-emerald-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery store run"
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
              {transaction ? "Save Changes" : "Add Transaction"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
