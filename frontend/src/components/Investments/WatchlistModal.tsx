import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [assetType, setAssetType] = useState<"stock" | "crypto">("stock");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAssetType("stock");
      setTicker("");
      setName("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) {
      setError("Please specify a ticker symbol");
      return;
    }
    if (!name.trim()) {
      setError("Please specify an asset name");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      asset_type: assetType,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
    };

    try {
      await api.post("/investments/watchlist", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while adding to watchlist."
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
          <h3 className="font-bold text-lg">Watch New Asset</h3>
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
          
          {/* Asset Type Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Asset Category
            </label>
            <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAssetType("stock")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${assetType === "stock"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Stock
              </button>
              <button
                type="button"
                onClick={() => setAssetType("crypto")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${assetType === "crypto"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Cryptocurrency
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Ticker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Symbol / Ticker
              </label>
              <input
                type="text"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="e.g. AAPL, BTC"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-bold uppercase"
              />
            </div>

            {/* Asset Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Asset Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple Inc."
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
              />
            </div>
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
              Watch Asset
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
