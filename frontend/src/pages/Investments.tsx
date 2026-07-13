import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  HelpCircle,
  Eye,
  DollarSign,
  X
} from "lucide-react";
import { TradeModal } from "../components/Investments/TradeModal";
import { WatchlistModal } from "../components/Investments/WatchlistModal";

const ALLOCATION_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // purple
];

export const Investments: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("holdings");
  
  // Modals state
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [tradeDefault, setTradeDefault] = useState<"stock" | "crypto">("stock");
  const [isWatchOpen, setIsWatchOpen] = useState(false);

  // AI Advisor States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleGetAIAdvice = async () => {
    if (!portfolio) return;
    setIsAiLoading(true);
    setAiAdvice(null);
    setAiScore(null);
    setIsAiOpen(true);
    try {
      const res = await api.post("/ai/summarize-portfolio", portfolio);
      setAiAdvice(res.data.advisory_text);
      setAiScore(res.data.rebalance_score);
    } catch (err) {
      console.error(err);
      setAiAdvice("Failed to retrieve rebalancing advice. Please log trade orders first.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const parseAdviceMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-3 mb-1 text-foreground border-b border-border/40 pb-0.5">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-foreground">$1</strong>')
      .split('\n').join('<br />');
  };

  // ----------------- API QUERIES -----------------

  // 1. Fetch Portfolio summary & holdings
  const { data: portfolio, isLoading: isPortfolioLoading } = useQuery({
    queryKey: ["investmentPortfolio"],
    queryFn: async () => {
      const res = await api.get("/investments/portfolio");
      return res.data;
    },
  });

  // 2. Fetch historic transactions
  const { data: transactions, isLoading: isTxLoading } = useQuery({
    queryKey: ["investmentTransactions"],
    queryFn: async () => {
      const res = await api.get("/investments/transactions");
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  // Delete trade transaction record
  const deleteTradeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/investments/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentPortfolio"] });
      queryClient.invalidateQueries({ queryKey: ["investmentTransactions"] });
    },
  });

  // Remove asset from watchlist
  const unwatchMutation = useMutation({
    mutationFn: (ticker: string) => api.delete(`/investments/watchlist/${ticker}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentPortfolio"] });
    },
  });

  const handleDeleteTrade = (id: string) => {
    if (confirm("Are you sure you want to delete this trade record? This will recompute your holdings averages.")) {
      deleteTradeMutation.mutate(id);
    }
  };

  const handleUnwatch = (ticker: string) => {
    unwatchMutation.mutate(ticker);
  };

  const handleQuickTrade = (assetType: "stock" | "crypto") => {
    setTradeDefault(assetType);
    setIsTradeOpen(true);
  };

  // Coordinates helper for SVG donut chart slices
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
    return [x, y];
  };

  // Render visual donut chart for Stock vs Crypto split
  const renderAllocationChart = () => {
    if (!portfolio || !portfolio.allocation || portfolio.allocation.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
          <HelpCircle size={32} className="opacity-40 mb-2" />
          No investment holdings assets recorded.
        </div>
      );
    }

    let cumulativePercent = 0;
    const slices = portfolio.allocation.map((alloc: any, idx: number) => {
      const startPercent = cumulativePercent;
      cumulativePercent += alloc.percentage / 100;
      const endPercent = cumulativePercent;

      const [startX, startY] = getCoordinatesForPercent(startPercent);
      const [endX, endY] = getCoordinatesForPercent(endPercent);

      const largeArcFlag = alloc.percentage > 50 ? 1 : 0;

      const sX = startX * 40 + 50;
      const sY = startY * 40 + 50;
      const eX = endX * 40 + 50;
      const eY = endY * 40 + 50;

      const pathData = [
        `M 50 50`,
        `L ${sX} ${sY}`,
        `A 40 40 0 ${largeArcFlag} 1 ${eX} ${eY}`,
        `Z`
      ].join(" ");

      return {
        pathData,
        color: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
        name: alloc.name,
        percent: alloc.percentage,
        value: alloc.value
      };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {slices.map((slice: any, idx: number) => (
              <path
                key={idx}
                d={slice.pathData}
                fill={slice.color}
                className="hover:opacity-90 transition-opacity cursor-pointer"
              />
            ))}
            <circle cx="50" cy="50" r="24" className="fill-card" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Portfolio</span>
            <span className="text-sm font-extrabold">${portfolio.total_value.toFixed(0)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 w-full text-xs">
          {slices.map((slice: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="capitalize font-medium text-foreground">{slice.name}s</span>
              <span className="text-muted-foreground ml-1">(${slice.value.toLocaleString()})</span>
              <span className="font-bold ml-auto">{slice.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPLColorClass = (val: number) => {
    return val >= 0 ? "text-emerald-500" : "text-rose-500";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investment Tracker</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor stock portfolios, cryptos allocations, watchlists, and profit yields
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGetAIAdvice}
            className="py-2 px-3.5 bg-gradient-to-tr from-primary to-accent border border-primary/20 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow hover:opacity-90 transition-opacity"
          >
            <Sparkles size={14} /> AI Advisor
          </button>
          <button
            onClick={() => setIsWatchOpen(true)}
            className="py-2 px-3.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye size={14} /> Watch Ticker
          </button>
          <button
            onClick={() => handleQuickTrade("stock")}
            className="py-2 px-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 text-xs flex items-center gap-1.5 shadow"
          >
            <Plus size={14} /> Log Trade
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Value */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Portfolio Net Value</p>
            <p className="text-xl font-extrabold mt-1">
              {isPortfolioLoading ? "..." : `$${(portfolio?.total_value ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Total Profit & Loss */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Profit & Loss</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-extrabold ${getPLColorClass(portfolio?.total_pl ?? 0)}`}>
                {isPortfolioLoading ? "..." : `${(portfolio?.total_pl ?? 0) >= 0 ? "+" : ""}${(portfolio?.total_pl ?? 0).toLocaleString()}`}
              </span>
              {!isPortfolioLoading && portfolio?.total_pl !== 0 && (
                <span className={`text-[10px] font-bold ${getPLColorClass(portfolio?.pl_percentage ?? 0)}`}>
                  ({portfolio?.pl_percentage}%)
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${(portfolio?.total_pl ?? 0) >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
            {(portfolio?.total_pl ?? 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
        </div>

        {/* Stock Allocations Value */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Stocks Value</p>
            <p className="text-xl font-extrabold mt-1 text-foreground">
              {isPortfolioLoading ? "..." : `$${(portfolio?.allocation?.find((a: any) => a.name === "stock")?.value ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
            <Activity size={20} />
          </div>
        </div>

        {/* Crypto Allocations Value */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cryptocurrency Value</p>
            <p className="text-xl font-extrabold mt-1 text-foreground">
              {isPortfolioLoading ? "..." : `$${(portfolio?.allocation?.find((a: any) => a.name === "crypto")?.value ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
            <Sparkles size={20} className="text-accent" />
          </div>
        </div>

      </div>

      {/* Analytics Grid: SVG Donut Allocation & Holdings Tickers Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Asset Class Allocation */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm mb-1">Asset Class Allocation</h3>
            <p className="text-xs text-muted-foreground mb-4">Stocks vs Cryptocurrency balance ratio</p>
            {isPortfolioLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : (
              renderAllocationChart()
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border/80 text-[10px] text-muted-foreground">
            Dynamic distribution balances calculated automatically based on purchase cost parameters.
          </div>
        </div>

        {/* Right Column: Holdings Concentration Bars */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-sm mb-1">Holdings Concentration</h3>
          <p className="text-xs text-muted-foreground mb-4">Highest valued ticker positions in your portfolio</p>
          
          {isPortfolioLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : !portfolio?.ticker_allocation || portfolio.ticker_allocation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
              <HelpCircle size={32} className="opacity-40 mb-2" />
              Add buy trades to visualize asset concentration.
            </div>
          ) : (
            <div className="space-y-4">
              {portfolio.ticker_allocation.map((tick: any, idx: number) => {
                const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
                return (
                  <div key={tick.ticker} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-foreground">{tick.ticker}</span>
                      <span className="text-muted-foreground">
                        ${tick.value.toLocaleString()} ({tick.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${tick.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Main Ledger View Tabbed Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Tab Selection */}
        <div className="flex border-b border-border bg-card/60 backdrop-blur">
          {["holdings", "watchlist", "transactions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all
                ${activeTab === tab
                  ? "border-primary text-primary bg-secondary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                }`}
            >
              {tab === "holdings" ? "Active Portfolio" : tab === "watchlist" ? "Watchlist Tickers" : "Trade Audit Log"}
            </button>
          ))}
        </div>

        {/* Tab Context Window */}
        <div className="p-6 min-h-[300px]">
          
          {/* TAB 1: ACTIVE HOLDINGS */}
          {activeTab === "holdings" && (
            <div className="space-y-4">
              {isPortfolioLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : !portfolio || portfolio.holdings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <HelpCircle size={32} className="opacity-40 mb-2" />
                  Your portfolio is empty. Add a buy trade to track assets!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                        <th className="py-2.5">Symbol</th>
                        <th className="py-2.5">Name</th>
                        <th className="py-2.5">Quantity</th>
                        <th className="py-2.5">Avg Buy Price</th>
                        <th className="py-2.5">Market Price</th>
                        <th className="py-2.5">Market Value</th>
                        <th className="py-2.5 text-right">Total P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((h: any) => (
                        <tr key={h.ticker} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <td className="py-2.5 font-extrabold tracking-wide text-foreground">{h.ticker}</td>
                          <td className="py-2.5 text-muted-foreground capitalize">{h.name}</td>
                          <td className="py-2.5 font-semibold">{h.quantity}</td>
                          <td className="py-2.5 text-muted-foreground">${h.average_cost.toLocaleString()}</td>
                          <td className="py-2.5 text-muted-foreground">${h.current_price.toLocaleString()}</td>
                          <td className="py-2.5 font-bold">${h.total_value.toLocaleString()}</td>
                          <td className={`py-2.5 text-right font-extrabold ${getPLColorClass(h.total_pl)}`}>
                            {h.total_pl >= 0 ? "+" : ""}${h.total_pl.toLocaleString()}{" "}
                            <span className="text-[10px] font-semibold">({h.pl_percentage}%)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WATCHLIST TICKERS */}
          {activeTab === "watchlist" && (
            <div className="space-y-4">
              {isPortfolioLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : !portfolio || portfolio.watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Eye size={32} className="opacity-40 mb-2" />
                  You aren't watching any assets. Click Watch Ticker to add some!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portfolio.watchlist.map((w: any) => (
                    <div key={w.id} className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex items-center justify-between group">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <h4 className="font-extrabold text-sm tracking-wide text-foreground">{w.ticker}</h4>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground px-1 py-0.2 bg-secondary border border-border/80 rounded">
                            {w.asset_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]">{w.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUnwatch(w.ticker)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRADE AUDIT LOG */}
          {activeTab === "transactions" && (
            <div className="space-y-4">
              {isTxLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Activity size={32} className="opacity-40 mb-2" />
                  No trade transactions logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                        <th className="py-2.5">Action</th>
                        <th className="py-2.5">Symbol</th>
                        <th className="py-2.5">Asset Class</th>
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Quantity</th>
                        <th className="py-2.5">Price</th>
                        <th className="py-2.5">Total Value</th>
                        <th className="py-2.5 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <td className="py-2.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase
                              ${tx.transaction_type === "buy" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="py-2.5 font-bold text-foreground">{tx.ticker}</td>
                          <td className="py-2.5 text-muted-foreground capitalize">{tx.asset_type}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 font-medium">{tx.quantity}</td>
                          <td className="py-2.5 text-muted-foreground">${tx.price.toLocaleString()}</td>
                          <td className="py-2.5 font-bold">${(tx.quantity * tx.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteTrade(tx.id)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Trade execution modal */}
      <TradeModal
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["investmentPortfolio"] });
          queryClient.invalidateQueries({ queryKey: ["investmentTransactions"] });
        }}
        defaultType={tradeDefault}
      />

      {/* Watchlist adder modal */}
      <WatchlistModal
        isOpen={isWatchOpen}
        onClose={() => setIsWatchOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["investmentPortfolio"] });
        }}
      />

      {/* AI Advisor Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg flex items-center gap-1.5">
                <Sparkles className="text-primary animate-pulse" size={18} />
                Violet AI Advisor
              </h3>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span className="text-xs text-muted-foreground font-semibold">Analyzing portfolio parameters...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rebalance Score Card */}
                  {aiScore !== null && (
                    <div className="p-4 bg-secondary/25 border border-border/40 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rebalance Index Score</h4>
                        <p className="text-2xl font-black mt-1 text-foreground">{aiScore} / 100</p>
                      </div>
                      <div className="w-16 h-16 relative">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            className="stroke-secondary stroke-3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            className="stroke-primary stroke-3"
                            strokeDasharray={`${aiScore}, 100`}
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Advisory Text */}
                  <div
                    className="text-xs leading-relaxed text-foreground select-text space-y-2 font-medium"
                    dangerouslySetInnerHTML={{ __html: parseAdviceMarkdown(aiAdvice || "") }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-border bg-secondary/5">
              <button
                onClick={() => setIsAiOpen(false)}
                className="py-2 px-4 bg-secondary border border-border hover:bg-secondary/80 rounded-xl text-xs font-semibold"
              >
                Close Advisor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
