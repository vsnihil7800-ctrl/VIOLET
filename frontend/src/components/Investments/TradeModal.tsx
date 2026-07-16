import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: "stock" | "crypto";
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = "stock",
}) => {
  const [assetType, setAssetType] = useState<"stock" | "crypto">("stock");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [tradeType, setTradeType] = useState("buy"); // "buy" | "sell"
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAssetType(defaultType);
      setTicker("");
      setName("");
      setTradeType("buy");
      setQuantity("");
      setPrice("");
      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setDate(localDate.toISOString().slice(0, 16));
      setError(null);
    }
  }, [isOpen, defaultType]);

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
    if (!quantity || parseFloat(quantity) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      asset_type: assetType,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      transaction_type: tradeType,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date: new Date(date).toISOString(),
    };

    try {
      await api.post("/investments/transactions", payload);
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
          <h3 className="font-bold text-lg">Log Asset Trade</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold animate-shake">
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

          {/* Trade Type (Buy/Sell) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Action
            </label>
            <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTradeType("buy")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${tradeType === "buy"
                    ? "bg-card text-emerald-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Buy (Long)
              </button>
              <button
                type="button"
                onClick={() => setTradeType("sell")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all
                  ${tradeType === "sell"
                    ? "bg-card text-rose-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Sell (Short / Liquidate)
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

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Price (₹ / Unit)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Trade Timestamp
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              Submit Order
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
