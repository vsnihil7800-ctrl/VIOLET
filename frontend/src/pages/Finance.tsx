import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  HelpCircle,
  PlusCircle,
  Calendar
} from "lucide-react";
import { TransactionModal } from "../components/Finance/TransactionModal";
import { BudgetModal } from "../components/Finance/BudgetModal";
import { DebtModal } from "../components/Finance/DebtModal";

const COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // purple
  "#a855f7", // light purple
];

export const Finance: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transactions");
  
  // Modals state
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);

  // Pagination & Filters state
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // ----------------- API QUERIES -----------------

  // 1. Fetch Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["financeSummary"],
    queryFn: async () => {
      const res = await api.get("/finance/summary");
      return res.data;
    },
  });

  // 2. Fetch Transactions (with parameters for pagination, filters)
  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ["financeTransactions", page, search, typeFilter],
    queryFn: async () => {
      const res = await api.get("/finance/transactions", {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          limit,
          offset: (page - 1) * limit,
        },
      });
      return res.data;
    },
  });

  // 3. Fetch Budgets
  const { data: budgets, isLoading: isBudgetsLoading } = useQuery({
    queryKey: ["financeBudgets"],
    queryFn: async () => {
      const res = await api.get("/finance/budgets");
      return res.data;
    },
  });

  // 4. Fetch Debts
  const { data: debts, isLoading: isDebtsLoading } = useQuery({
    queryKey: ["financeDebts"],
    queryFn: async () => {
      const res = await api.get("/finance/debts");
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  // Delete Transaction
  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
    },
  });

  // Delete Budget
  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeBudgets"] });
      queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
    },
  });

  // Delete Debt
  const deleteDebtMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/debts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeDebts"] });
      queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
    },
  });

  // Settle Debt Toggle (PUT endpoint update)
  const settleDebtMutation = useMutation({
    mutationFn: ({ id, is_settled }: { id: string; is_settled: boolean }) =>
      api.put(`/finance/debts/${id}`, { is_settled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeDebts"] });
      queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
    },
  });

  // ----------------- MATH HELPERS -----------------

  // Converts percentage value to SVG path coordinate layout for donut slices
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
    return [x, y];
  };

  const handleEditTxClick = (tx: any) => {
    setEditingTx(tx);
    setIsTxOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTxMutation.mutate(id);
    }
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm("Are you sure you want to delete this budget limit?")) {
      deleteBudgetMutation.mutate(id);
    }
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm("Are you sure you want to delete this debt record?")) {
      deleteDebtMutation.mutate(id);
    }
  };

  const handleToggleSettleDebt = (id: string, currentStatus: boolean) => {
    settleDebtMutation.mutate({ id, is_settled: !currentStatus });
  };

  const totalPages = txData ? Math.ceil(txData.total / limit) : 1;

  // Render Visual Donut Chart Elements
  const renderDonutChart = () => {
    if (!summary || !summary.categories || summary.categories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
          <HelpCircle size={32} className="opacity-40 mb-2" />
          No expense categories recorded this month.
        </div>
      );
    }

    let cumulativePercent = 0;
    const slices = summary.categories.map((cat: any, idx: number) => {
      const startPercent = cumulativePercent;
      cumulativePercent += cat.percentage / 100;
      const endPercent = cumulativePercent;

      const [startX, startY] = getCoordinatesForPercent(startPercent);
      const [endX, endY] = getCoordinatesForPercent(endPercent);

      // Large arc flag is 1 if slice takes up more than 50% of circle
      const largeArcFlag = cat.percentage > 50 ? 1 : 0;

      // Scale coords from radius 1 to radius 40
      const sX = startX * 40 + 50;
      const sY = startY * 40 + 50;
      const eX = endX * 40 + 50;
      const eY = endY * 40 + 50;

      // SVG path command drawing segment arc
      const pathData = [
        `M 50 50`,
        `L ${sX} ${sY}`,
        `A 40 40 0 ${largeArcFlag} 1 ${eX} ${eY}`,
        `Z`
      ].join(" ");

      return {
        pathData,
        color: COLORS[idx % COLORS.length],
        name: cat.category,
        percent: cat.percentage
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
            {/* Center circle overlay to mask inner center to make donut shape */}
            <circle cx="50" cy="50" r="24" className="fill-card" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Expenses</span>
            <span className="text-base font-extrabold">${summary.total_expenses.toFixed(0)}</span>
          </div>
        </div>

        {/* Chart Legends */}
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
          {slices.map((slice: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-muted-foreground max-w-[80px]">{slice.name}</span>
              <span className="font-bold ml-auto">{slice.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance Ledger</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log cash flow, set strict budget targets, and track credit loans
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingTx(null);
              setIsTxOpen(true);
            }}
            className="py-2 px-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 text-xs flex items-center gap-1.5 shadow"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Savings Balance Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Net Cash Flow</p>
            <p className={`text-xl font-extrabold mt-1 ${(summary?.net_savings ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {isSummaryLoading ? "..." : `$${(summary?.net_savings ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Scale size={20} />
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Monthly Income</p>
            <p className="text-xl font-extrabold mt-1 text-emerald-500">
              {isSummaryLoading ? "..." : `$${(summary?.total_income ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Monthly Expenses</p>
            <p className="text-xl font-extrabold mt-1 text-destructive">
              {isSummaryLoading ? "..." : `$${(summary?.total_expenses ?? 0).toLocaleString()}`}
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <TrendingDown size={20} />
          </div>
        </div>

        {/* Debts Summary Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Owed to Me</span>
            <span className="text-xs font-bold text-emerald-500">
              {isSummaryLoading ? "..." : `$${summary?.total_owed_to_me}`}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Money I Owe</span>
            <span className="text-xs font-bold text-destructive">
              {isSummaryLoading ? "..." : `$${summary?.total_owed_by_me}`}
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid: Charts & Tabular Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual Analytics Chart */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm mb-1">Expense Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-4">Category totals for the current month</p>
            {isSummaryLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : (
              renderDonutChart()
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border/80 text-[10px] text-muted-foreground flex gap-1 items-center">
            <Calendar size={12} /> Auto-calculating for current calendar month.
          </div>
        </div>

        {/* Right Column: Interactive Details Panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          
          {/* Tabs header */}
          <div className="flex border-b border-border bg-card/60 backdrop-blur">
            {["transactions", "budgets", "debts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all
                  ${activeTab === tab
                    ? "border-primary text-primary bg-secondary/20"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content wrapper */}
          <div className="p-6 flex-1 min-h-[350px]">
            
            {/* 1. TRANSACTIONS TAB */}
            {activeTab === "transactions" && (
              <div className="space-y-4">
                
                {/* Filters Row */}
                <div className="flex flex-wrap gap-2.5">
                  <div className="flex-1 min-w-[150px] relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground pointer-events-none">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1); // Reset page on filter
                      }}
                      placeholder="Search description..."
                      className="w-full pl-8 pr-3 py-1.5 bg-secondary/40 border border-border rounded-lg outline-none focus:border-primary text-xs"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2 py-1.5 bg-secondary/40 border border-border rounded-lg outline-none text-xs font-medium"
                  >
                    <option value="">All Types</option>
                    <option value="expense">Expenses</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                {/* Table */}
                {isTxLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                  </div>
                ) : !txData || txData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs">
                    <Wallet size={32} className="opacity-40 mb-2" />
                    No transactions match the selected criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                          <th className="py-2.5">Type</th>
                          <th className="py-2.5">Category</th>
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">Amount</th>
                          <th className="py-2.5 hidden sm:table-cell">Description</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txData.items.map((tx: any) => (
                          <tr key={tx.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                            <td className="py-2.5 font-bold">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase
                                ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2.5 font-medium text-foreground">{tx.category}</td>
                            <td className="py-2.5 text-muted-foreground">
                              {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </td>
                            <td className={`py-2.5 font-bold ${tx.type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                              {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                            </td>
                            <td className="py-2.5 text-muted-foreground max-w-[120px] truncate hidden sm:table-cell">
                              {tx.description || "—"}
                            </td>
                            <td className="py-2.5 text-right flex justify-end gap-1.5 mt-0.5">
                              <button
                                onClick={() => handleEditTxClick(tx)}
                                className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 rounded transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id)}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 text-xs">
                        <span className="text-muted-foreground">
                          Page <strong>{page}</strong> of {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1.5 border border-border hover:bg-secondary rounded-lg disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1.5 border border-border hover:bg-secondary rounded-lg disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. BUDGETS TAB */}
            {activeTab === "budgets" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Limits</h4>
                  <button
                    onClick={() => setIsBudgetOpen(true)}
                    className="py-1 px-3 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <PlusCircle size={14} /> Set Budget
                  </button>
                </div>

                {isBudgetsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                  </div>
                ) : !budgets || budgets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs">
                    <Wallet size={32} className="opacity-40 mb-2" />
                    No budget limits set. Let's create one!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Render live status or limits */}
                    {summary?.budgets.map((b: any) => {
                      const isOver = b.percent > 100;
                      const isNear = b.percent > 80 && b.percent <= 100;
                      return (
                        <div key={b.id} className="p-4 bg-secondary/20 border border-border/60 rounded-xl relative group">
                          <button
                            onClick={() => handleDeleteBudget(b.id)}
                            className="absolute top-2.5 right-2.5 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} />
                          </button>
                          
                          <h5 className="font-bold text-xs uppercase text-foreground">{b.category === "All" ? "Overall Limit" : b.category}</h5>
                          <div className="flex justify-between items-baseline mt-2 mb-1.5">
                            <span className="text-xs text-muted-foreground">
                              Spent <strong>${b.spent.toFixed(0)}</strong> of ${b.limit_amount}
                            </span>
                            <span className={`text-xs font-bold ${isOver ? "text-rose-500" : isNear ? "text-amber-500" : "text-emerald-500"}`}>
                              {b.percent}%
                            </span>
                          </div>
                          
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300
                                ${isOver ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(b.percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. DEBTS TAB */}
            {activeTab === "debts" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IOUs & Loans</h4>
                  <button
                    onClick={() => setIsDebtOpen(true)}
                    className="py-1 px-3 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <PlusCircle size={14} /> Add Record
                  </button>
                </div>

                {isDebtsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                  </div>
                ) : !debts || debts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs">
                    <Scale size={32} className="opacity-40 mb-2" />
                    No debt records found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columns Owed to Me */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pb-1 border-b border-border/80">
                        Money Owed to Me
                      </h5>
                      <div className="space-y-2">
                        {debts.filter((d: any) => d.type === "owed_to_me").map((d: any) => (
                          <div key={d.id} className={`p-3 bg-secondary/15 border border-border/40 rounded-lg flex items-center justify-between group transition-opacity ${d.is_settled ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleToggleSettleDebt(d.id, d.is_settled)}
                                className={`w-4 h-4 rounded border flex items-center justify-center text-white
                                  ${d.is_settled ? "bg-emerald-500 border-emerald-600" : "border-border hover:border-primary"}`}
                              >
                                {d.is_settled && <span className="text-[9px]">✔</span>}
                              </button>
                              <div>
                                <p className={`text-xs font-semibold ${d.is_settled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {d.person}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{d.description || "No notes"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${d.is_settled ? "text-muted-foreground line-through" : "text-emerald-500"}`}>
                                ${d.amount.toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleDeleteDebt(d.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Columns Owed by Me */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-destructive uppercase tracking-widest pb-1 border-b border-border/80">
                        Money I Owe (Debts)
                      </h5>
                      <div className="space-y-2">
                        {debts.filter((d: any) => d.type === "owed_by_me").map((d: any) => (
                          <div key={d.id} className={`p-3 bg-secondary/15 border border-border/40 rounded-lg flex items-center justify-between group transition-opacity ${d.is_settled ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleToggleSettleDebt(d.id, d.is_settled)}
                                className={`w-4 h-4 rounded border flex items-center justify-center text-white
                                  ${d.is_settled ? "bg-emerald-500 border-emerald-600" : "border-border hover:border-primary"}`}
                              >
                                {d.is_settled && <span className="text-[9px]">✔</span>}
                              </button>
                              <div>
                                <p className={`text-xs font-semibold ${d.is_settled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {d.person}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{d.description || "No notes"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${d.is_settled ? "text-muted-foreground line-through" : "text-destructive"}`}>
                                ${d.amount.toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleDeleteDebt(d.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ----------------- DIALOG MODALS ----------------- */}
      <TransactionModal
        isOpen={isTxOpen}
        onClose={() => {
          setIsTxOpen(false);
          setEditingTx(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financeTransactions"] });
          queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
        }}
        transaction={editingTx}
      />

      <BudgetModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financeBudgets"] });
          queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
        }}
      />

      <DebtModal
        isOpen={isDebtOpen}
        onClose={() => setIsDebtOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financeDebts"] });
          queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
        }}
      />

    </div>
  );
};
