import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { TransactionModal } from "../components/Finance/TransactionModal";
import {
  Wallet,
  TrendingUp,
  Dumbbell,
  CheckSquare,
  Sparkles,
  ArrowUpRight,
  Flame,
  Code,
  Utensils,
  Lock,
  Calendar,
  Clock,
  ArrowRight,
  Loader2
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // ----------------- UNIFIED STATS QUERIES -----------------

  // 1. Finance summary
  const { data: summary } = useQuery({
    queryKey: ["financeSummary"],
    queryFn: async () => {
      const res = await api.get("/finance/summary");
      return res.data;
    },
  });

  // 2. Investment Portfolio
  const { data: portfolio } = useQuery({
    queryKey: ["investmentPortfolio"],
    queryFn: async () => {
      const res = await api.get("/investments/portfolio");
      return res.data;
    },
  });

  // 3. Fitness Summary
  const { data: fitnessSummary } = useQuery({
    queryKey: ["fitnessSummary"],
    queryFn: async () => {
      const res = await api.get("/fitness/summary");
      return res.data;
    },
  });

  // 4. Productivity Summary
  const { data: prodSummary } = useQuery({
    queryKey: ["productivitySummary"],
    queryFn: async () => {
      const res = await api.get("/productivity/summary");
      return res.data;
    },
  });

  // 5. Schedule & Vault Summary
  const { data: scheduleSummary } = useQuery({
    queryKey: ["scheduleSummary"],
    queryFn: async () => {
      const res = await api.get("/schedule/summary");
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  // Toggle todo directly from dashboard checklist
  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch(`/productivity/todos/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
    },
  });

  const handleToggleTodo = (id: string, currentCompleted: boolean) => {
    toggleTodoMutation.mutate({ id, completed: !currentCompleted });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setIsTyping(true);
    setChatResponse(null);

    setTimeout(() => {
      setIsTyping(false);
      setChatResponse(
        `Hi ${user?.full_name?.split(" ")[0] || "User"}! I've loaded your context: Cash Flow is $${(summary?.net_savings ?? 0).toLocaleString()}, Stocks/Cryptos value is $${(portfolio?.total_value ?? 0).toLocaleString()}, Gym Streak is ${fitnessSummary?.gym_streak ?? 0} days, and Coding Streak is ${prodSummary?.coding_streak ?? 0} days. In Phase 9, I will fully assist you with automated reports and chat insights!`
      );
    }, 1200);

    setChatMessage("");
  };

  // Aggregated Net Worth
  const cashBalance = summary?.net_savings ?? 0;
  const portfolioValue = portfolio?.total_value ?? 0;
  const netWorth = cashBalance + portfolioValue;

  // ----------------- SVG HISTORIC CASH FLOW BAR CHART -----------------
  const renderCashFlowChart = () => {
    const history = summary?.cash_flow_history;
    if (!history || history.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs bg-secondary/10 rounded-xl border border-dashed border-border/80">
          <Wallet size={24} className="opacity-30 mb-1.5" />
          No financial cash flow records found.
        </div>
      );
    }

    const paddingX = 40;
    const paddingY = 20;
    const width = 450;
    const height = 150;

    // Find max income/expense to scale Y axis
    const maxVal = Math.max(...history.map((h: any) => Math.max(h.income, h.expenses, 500)));
    const gridVal = maxVal || 1000;

    const columnWidth = (width - 2 * paddingX) / history.length;
    const barWidth = 10;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          {/* Y Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} className="stroke-border/40 stroke-1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} className="stroke-border/40 stroke-1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="stroke-border/60 stroke-1" />

          {/* Bar Charts */}
          {history.map((data: any, idx: number) => {
            const groupX = paddingX + idx * columnWidth + columnWidth / 2;
            
            // Scaled heights
            const incHeight = ((data.income) / gridVal) * (height - 2 * paddingY);
            const expHeight = ((data.expenses) / gridVal) * (height - 2 * paddingY);

            const incY = height - paddingY - incHeight;
            const expY = height - paddingY - expHeight;

            return (
              <g key={data.month} className="group/bar cursor-pointer">
                {/* Income Bar (Green Gradient simulation) */}
                <rect
                  x={groupX - barWidth - 2}
                  y={incY}
                  width={barWidth}
                  height={incHeight}
                  rx="2"
                  className="fill-emerald-500 hover:fill-emerald-400 transition-colors"
                />
                
                {/* Expense Bar (Rose Gradient) */}
                <rect
                  x={groupX + 2}
                  y={expY}
                  width={barWidth}
                  height={expHeight}
                  rx="2"
                  className="fill-rose-500 hover:fill-rose-400 transition-colors"
                />

                {/* X labels */}
                <text x={groupX} y={height - 5} className="fill-muted-foreground text-[8px] font-bold" textAnchor="middle">
                  {data.month}
                </text>

                {/* Tooltip on group hover */}
                <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect x={groupX - 50} y={paddingY - 15} width="100" height="24" rx="4" className="fill-foreground shadow-md" />
                  <text x={groupX} y={paddingY - 4} className="fill-background text-[7px] font-bold" textAnchor="middle">
                    Inc: ₹{data.income.toFixed(0)} | Exp: ₹{data.expenses.toFixed(0)}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Command Center Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-border p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4 animate-pulse">
            <Sparkles size={12} /> Personal Command Center
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "User"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Violet has consolidated your financial portfolios, gym calendars, code habits, and vault lockers into a unified command space.
          </p>
        </div>
      </div>

      {/* Top Metrics Ribbon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Worth */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Aggregated Net Worth</p>
            <p className="text-xl font-black mt-1 text-foreground">
              ₹{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform">
            <Wallet size={20} />
          </div>
        </div>

        {/* Gym Streak */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Gym Streak</p>
            <p className="text-xl font-black mt-1 text-orange-500">
              {fitnessSummary?.gym_streak ?? 0} Days Active
            </p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-105 transition-transform">
            <Flame size={20} className="fill-orange-500/20" />
          </div>
        </div>

        {/* Coding Streak */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Coding Streak</p>
            <p className="text-xl font-black mt-1 text-indigo-500">
              {prodSummary?.coding_streak ?? 0} Days Active
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:scale-105 transition-transform">
            <Code size={20} />
          </div>
        </div>

        {/* Secure Document Vault Lockers */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Secure Vault Locker</p>
            <p className="text-xl font-black mt-1 text-foreground">
              {scheduleSummary?.documents_count ?? 0} Indexed Files
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground group-hover:scale-105 transition-transform">
            <Lock size={20} />
          </div>
        </div>

      </div>

      {/* Core Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Cash Flow Trend chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm mb-0.5">Cash Flow Analytics</h3>
                <p className="text-xs text-muted-foreground">Historical monthly income (green) vs expenses (red)</p>
              </div>
            </div>
            {renderCashFlowChart()}
          </div>
        </div>

        {/* Right Column: Today's agenda timelines */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-bold text-sm mb-0.5 flex items-center gap-1.5">
              <Calendar size={16} className="text-primary" /> Today's Planners
            </h3>
            
            {!scheduleSummary || !scheduleSummary.today_events || scheduleSummary.today_events.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-[10px] bg-secondary/5 border border-dashed border-border/40 rounded-xl">
                <Clock size={20} className="opacity-35 mb-1.5" />
                No calendar events blocked today.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[140px] overflow-y-auto pr-1">
                {scheduleSummary.today_events.map((ev: any) => (
                  <div key={ev.id} className="p-3 bg-secondary/15 border border-border/40 rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{ev.title}</h4>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={9} />
                        {new Date(ev.start_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(ev.end_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0
                      ${ev.color === "indigo" ? "bg-indigo-500" : ""}
                      ${ev.color === "emerald" ? "bg-emerald-500" : ""}
                      ${ev.color === "amber" ? "bg-amber-500" : ""}
                      ${ev.color === "rose" ? "bg-rose-500" : ""}
                      ${ev.color === "slate" ? "bg-slate-500" : ""}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border/80 pt-4 flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Alarms scheduled: {scheduleSummary?.total_reminders ?? 0} active</span>
            <Link to="/schedule" className="text-primary hover:text-primary/80 font-semibold flex items-center gap-0.5">
              Open Calendar <ArrowRight size={10} />
            </Link>
          </div>
        </div>

      </div>

      {/* Module Operations Grid Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Module 1: Investment Portfolio */}
        <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp size={22} />
              </div>
              <Link to="/investments" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <h3 className="font-bold text-lg mb-1">Stocks & Cryptos</h3>
            <p className="text-xs text-muted-foreground mb-4">Portfolio value & active allocations</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Total Holdings Value</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-extrabold">₹{(portfolio?.total_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {portfolio?.total_pl !== undefined && portfolio?.total_pl !== 0 && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5
                      ${portfolio.total_pl >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {portfolio.total_pl >= 0 ? "+" : ""}{portfolio.total_pl.toLocaleString()} ({portfolio.pl_percentage}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Ticker list preview */}
              <div className="space-y-2">
                {!portfolio || !portfolio.holdings || portfolio.holdings.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground bg-secondary/35 border border-border/40 p-2.5 rounded-xl text-center">
                    No active assets held.
                  </div>
                ) : (
                  portfolio.holdings.slice(0, 2).map((h: any) => (
                    <div key={h.ticker} className="flex justify-between text-xs py-1.5 border-b border-border/50">
                      <div className="flex gap-1.5 items-center">
                        <span className="font-bold">{h.ticker}</span>
                        <span className="text-muted-foreground text-[10px] capitalize truncate max-w-[80px]">{h.name}</span>
                      </div>
                      <span className="font-semibold">
                        ₹{h.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className={`font-bold ml-1.5 ${h.total_pl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {h.total_pl >= 0 ? "+" : ""}{h.pl_percentage}%
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <Link 
            to="/investments"
            className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
          >
            Manage Portfolio
          </Link>
        </div>

        {/* Module 2: Fitness Summary */}
        <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <Dumbbell size={22} />
              </div>
              <Link to="/fitness" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <h3 className="font-bold text-lg mb-1">Fitness & Nutrition</h3>
            <p className="text-xs text-muted-foreground mb-4">Calorie intake & streak progress</p>
            
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/30 text-center">
                  <Flame size={20} className="text-orange-500 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Streak</p>
                  <p className="text-lg font-extrabold mt-0.5">{fitnessSummary?.gym_streak ?? 0} Days</p>
                </div>
                <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/30 text-center">
                  <Utensils size={20} className="text-rose-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Calories</p>
                  <p className="text-lg font-extrabold mt-0.5">
                    {fitnessSummary?.today_calories_eaten?.toFixed(0) ?? 0} / {fitnessSummary?.target_calories ?? 2200}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Protein Target</span>
                  <span className="font-semibold">{(fitnessSummary?.macro_totals?.protein ?? 0).toFixed(0)}g / 130g</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-400 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(((fitnessSummary?.macro_totals?.protein ?? 0) / 130) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <Link
            to="/fitness"
            className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
          >
            Log Calorie Tracker
          </Link>
        </div>

        {/* Module 3: Productivity checklists */}
        <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <CheckSquare size={22} />
              </div>
              <Link to="/productivity" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <h3 className="font-bold text-lg mb-1">Workspace checklists</h3>
            <p className="text-xs text-muted-foreground mb-4">Checklist tasks & active streak indicators</p>

            <div className="space-y-3.5 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Coding Habit:</span>
                <span className="font-bold text-primary">{prodSummary?.coding_streak ?? 0} Days Streak</span>
              </div>
              
              <div className="space-y-2">
                {!prodSummary || !prodSummary.top_todos || prodSummary.top_todos.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground bg-secondary/35 border border-border/40 p-2.5 rounded-xl text-center">
                    No pending tasks today.
                  </div>
                ) : (
                  prodSummary.top_todos.map((todo: any) => (
                    <div
                      key={todo.id}
                      onClick={() => handleToggleTodo(todo.id, todo.completed)}
                      className="flex items-center gap-2.5 p-2 bg-secondary/30 hover:bg-secondary/60 border border-border/40 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        readOnly
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-xs truncate max-w-[150px] ${todo.completed ? "line-through text-muted-foreground animate-strikethrough" : "font-medium"}`}>
                        {todo.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <Link
            to="/productivity"
            className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
          >
            Manage Workspace
          </Link>
        </div>

      </div>

      {/* Violet AI chat helper assistant quick panel */}
      <div className="bg-gradient-to-b from-card to-secondary/35 rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all flex flex-col justify-between">
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 bg-gradient-to-tr from-primary to-accent rounded-xl text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Chat with Violet</h3>
              <p className="text-[10px] text-muted-foreground">Context Aware Assistant</p>
            </div>
          </div>

          {chatResponse && (
            <div className="p-3 bg-secondary/30 border border-border/60 rounded-xl text-xs leading-relaxed text-foreground animate-fade-in mb-4">
              {chatResponse}
            </div>
          )}

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              required
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask Violet (e.g. How is my coding streak? What is my net worth?)"
              className="flex-1 px-3 py-2 bg-secondary/50 border border-border rounded-xl outline-none text-xs"
            />
            <button
              type="submit"
              disabled={isTyping}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 flex items-center gap-1 transition-colors"
            >
              {isTyping ? <Loader2 size={12} className="animate-spin" /> : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Finance Transaction modal */}
      <TransactionModal
        isOpen={isTxOpen}
        onClose={() => setIsTxOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
        }}
      />

    </div>
  );
};
