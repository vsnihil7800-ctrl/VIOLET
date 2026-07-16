import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Dumbbell,
  Flame,
  Utensils,
  PlusCircle,
  Trash2,
  Loader2,
  Sparkles,
  Camera,
  Activity,
  FileImage,
  Weight,
  BarChart3
} from "lucide-react";
import { WorkoutModal } from "../components/Fitness/WorkoutModal";
import { MealModal } from "../components/Fitness/MealModal";
import type { MealPrefill } from "../components/Fitness/MealModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const IMAGE_SERVER_BASE = API_BASE.replace("/api/v1", ""); // Serves static files from base host

export const Fitness: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("meals");
  
  // Modals state
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);
  const [isMealOpen, setIsMealOpen] = useState(false);
  const [prefillMeal, setPrefillMeal] = useState<MealPrefill | null>(null);

  // Calorie & Weight inputs state
  const [newWeight, setNewWeight] = useState("");
  const [isWeightSaving, setIsWeightSaving] = useState(false);

  // File scanner state
  const [scannedData, setScannedData] = useState<MealPrefill | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Past-day calories bar chart toggle
  const [showCalorieHistory, setShowCalorieHistory] = useState(false);

  // ----------------- API QUERIES -----------------

  // 1. Fetch Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["fitnessSummary"],
    queryFn: async () => {
      const res = await api.get("/fitness/summary");
      return res.data;
    },
  });

  // 2. Fetch Today's meals
  const { data: meals, isLoading: isMealsLoading } = useQuery({
    queryKey: ["fitnessMeals"],
    queryFn: async () => {
      const res = await api.get("/fitness/meals");
      return res.data;
    },
  });

  // 3. Fetch workouts log
  const { data: workouts, isLoading: isWorkoutsLoading } = useQuery({
    queryKey: ["fitnessWorkouts"],
    queryFn: async () => {
      const res = await api.get("/fitness/workouts");
      return res.data;
    },
  });

  // 4. Fetch weights log
  const { data: weights, isLoading: isWeightsLoading } = useQuery({
    queryKey: ["fitnessWeights"],
    queryFn: async () => {
      const res = await api.get("/fitness/weights");
      return res.data;
    },
  });

  // 5. Fetch past-days calorie history (only once the bar chart is opened)
  const { data: calorieHistory, isLoading: isCalorieHistoryLoading } = useQuery({
    queryKey: ["fitnessCalorieHistory"],
    queryFn: async () => {
      const res = await api.get("/fitness/meals/calories-history", { params: { days: 7 } });
      return res.data;
    },
    enabled: showCalorieHistory,
  });

  // ----------------- MUTATIONS -----------------

  // Delete workout
  const deleteWorkoutMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fitness/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fitnessWorkouts"] });
      queryClient.invalidateQueries({ queryKey: ["fitnessSummary"] });
    },
  });

  // Delete meal log
  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fitness/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fitnessMeals"] });
      queryClient.invalidateQueries({ queryKey: ["fitnessSummary"] });
    },
  });

  // Log weight
  const logWeightMutation = useMutation({
    mutationFn: (weight: number) => api.post("/fitness/weights", { weight_kg: weight }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fitnessWeights"] });
      queryClient.invalidateQueries({ queryKey: ["fitnessSummary"] });
      setNewWeight("");
      setIsWeightSaving(false);
    },
  });

  const handleDeleteWorkout = (id: string) => {
    if (confirm("Delete this workout log?")) {
      deleteWorkoutMutation.mutate(id);
    }
  };

  const handleDeleteMeal = (id: string) => {
    if (confirm("Delete this calorie entry?")) {
      deleteMealMutation.mutate(id);
    }
  };

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || parseFloat(newWeight) <= 0) return;
    setIsWeightSaving(true);
    logWeightMutation.mutate(parseFloat(newWeight));
  };

  // ----------------- IMAGE UPLOAD SCANNER -----------------
  const handleFoodPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScannedData(null);
    setScanPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/ai/scan-food", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Response contains: image_path, food_name, calories, protein_g, carbs_g, fat_g
      setScannedData(response.data);
    } catch (err) {
      console.error("Meal upload failed:", err);
      alert("Failed to scan food photo. Using manual entry.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScannedMeal = () => {
    if (!scannedData) return;
    setPrefillMeal(scannedData);
    setIsMealOpen(true);
  };

  const handleClearScanner = () => {
    setScannedData(null);
    setScanPreview(null);
  };

  // ----------------- SVG WEIGHT GRAPH BUILDER -----------------
  const renderWeightGraph = () => {
    if (!weights || weights.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs bg-secondary/15 rounded-xl border border-dashed border-border p-4">
          <Weight size={32} className="opacity-30 mb-2" />
          Log weight at least twice to visualize progress charts.
        </div>
      );
    }

    const paddingX = 40;
    const paddingY = 20;
    const width = 450;
    const height = 150;

    const values = weights.map((w: any) => w.weight_kg);
    const minW = Math.min(...values) - 1.5;
    const maxW = Math.max(...values) + 1.5;
    const range = maxW - minW || 1;

    // Map database history points into SVG pixel coords
    const points = weights.map((w: any, idx: number) => {
      const x = paddingX + (idx / (weights.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((w.weight_kg - minW) / range) * (height - 2 * paddingY);
      return { x, y, weight: w.weight_kg, date: w.date };
    });

    const pathD = points.reduce((acc: string, p: any, idx: number) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    // Area path filled with gradient below trend lines
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} className="stroke-border/40 stroke-1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} className="stroke-border/40 stroke-1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="stroke-border/60 stroke-1" />

          {/* Gradient area */}
          <path d={areaD} fill="url(#weightAreaGrad)" />

          {/* Main trend line */}
          <path d={pathD} fill="none" stroke="rgb(var(--primary))" strokeWidth="2.5" />

          {/* Points */}
          {points.map((p: any, idx: number) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-primary stroke-background stroke-2 hover:r-6 hover:fill-accent transition-all duration-150"
              />
              {/* Tooltip labels on hover */}
              <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={p.x - 22} y={p.y - 25} width="44" height="18" rx="4" className="fill-foreground" />
                <text x={p.x} y={p.y - 13} className="fill-background text-[9px] font-extrabold text-center" textAnchor="middle">
                  {p.weight}kg
                </text>
              </g>
            </g>
          ))}

          {/* Axis Labels */}
          <text x={paddingX} y={height - 5} className="fill-muted-foreground text-[8px] font-semibold" textAnchor="start">
            {new Date(points[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
          <text x={width - paddingX} y={height - 5} className="fill-muted-foreground text-[8px] font-semibold" textAnchor="end">
            {new Date(points[points.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        </svg>
      </div>
    );
  };

  // ----------------- SVG CALORIES BAR CHART BUILDER -----------------
  const renderCaloriesBarChart = () => {
    if (isCalorieHistoryLoading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      );
    }

    if (!calorieHistory || calorieHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs bg-secondary/15 rounded-xl border border-dashed border-border p-4">
          <BarChart3 size={32} className="opacity-30 mb-2" />
          No past calorie data to chart yet.
        </div>
      );
    }

    const paddingX = 30;
    const paddingY = 20;
    const width = 500;
    const height = 200;
    const chartW = width - 2 * paddingX;
    const chartH = height - 2 * paddingY;

    const values = calorieHistory.map((d: any) => d.calories);
    const maxCal = Math.max(...values, 1) * 1.15; // headroom above tallest bar

    const barSlot = chartW / calorieHistory.length;
    const barWidth = Math.min(barSlot * 0.55, 44);

    const todayStr = new Date().toISOString().slice(0, 10);

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          {/* Baseline */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="stroke-border/60 stroke-1" />

          {calorieHistory.map((d: any, idx: number) => {
            const barH = (d.calories / maxCal) * chartH;
            const x = paddingX + idx * barSlot + (barSlot - barWidth) / 2;
            const y = height - paddingY - barH;
            const isToday = d.date === todayStr;

            return (
              <g key={d.date} className="group/bar cursor-pointer">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 1)}
                  rx="4"
                  className={`${isToday ? "fill-primary" : "fill-primary/40"} group-hover/bar:fill-accent transition-colors`}
                />

                {/* Value tooltip on hover */}
                <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150 pointer-events-none">
                  <rect x={x + barWidth / 2 - 24} y={y - 22} width="48" height="16" rx="4" className="fill-foreground" />
                  <text x={x + barWidth / 2} y={y - 10} className="fill-background text-[9px] font-extrabold" textAnchor="middle">
                    {d.calories.toFixed(0)} kcal
                  </text>
                </g>

                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={height - paddingY + 12}
                  className="fill-muted-foreground text-[8px] font-semibold"
                  textAnchor="middle"
                >
                  {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Macros progress mapping helper
  const renderMacroProgress = (label: string, value: number, target: number, color: string) => {
    const percent = Math.min((value / target) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-muted-foreground">{label}</span>
          <span>
            {value.toFixed(0)}g / {target}g
          </span>
        </div>
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fitness & Calorie Vault</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log exercises, track macros, generate weight graphs, and scan meal photos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPrefillMeal(null);
              setIsMealOpen(true);
            }}
            className="py-2 px-3.5 bg-secondary hover:bg-secondary/85 border border-border text-foreground font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <Utensils size={14} /> Log Meal
          </button>
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className="py-2 px-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 text-xs flex items-center gap-1.5 shadow"
          >
            <PlusCircle size={14} /> Log Workout
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gym Streak */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Gym Streak</p>
            <p className="text-2xl font-black mt-1 text-orange-500">
              {isSummaryLoading ? "..." : `${summary?.gym_streak ?? 0} Days`}
            </p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
            <Flame size={20} className="fill-orange-500/20" />
          </div>
        </div>

        {/* Calories Consumed Target */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Calories Consumed</p>
            <p className="text-2xl font-black mt-1 text-foreground">
              {isSummaryLoading ? "..." : `${summary?.today_calories_eaten.toFixed(0)} / ${summary?.target_calories} kcal`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Utensils size={20} />
          </div>
        </div>

        {/* Calories Burned */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Workout Burned</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">
              {isSummaryLoading ? "..." : `-${summary?.today_calories_burned.toFixed(0)} kcal`}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Dumbbell size={20} />
          </div>
        </div>

        {/* Latest Recorded Weight */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Body Weight</p>
            <p className="text-2xl font-black mt-1 text-foreground">
              {isSummaryLoading
                ? "..."
                : weights && weights.length > 0
                ? `${weights[weights.length - 1].weight_kg.toFixed(1)} kg`
                : "—"}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
            <Activity size={20} />
          </div>
        </div>

      </div>

      {/* Main Grid: line chart, macros, and photo scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Weight Progress Chart & Quick Weights Log */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm mb-0.5">Weight Progress</h3>
                <p className="text-xs text-muted-foreground">Historical body mass tracking parameters</p>
              </div>
              
              {/* Quick Weight Form */}
              <form onSubmit={handleWeightSubmit} className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="Weight (kg)"
                  className="w-24 px-2 py-1 bg-secondary/50 border border-border rounded-lg outline-none text-xs text-center"
                />
                <button
                  type="submit"
                  disabled={isWeightSaving}
                  className="py-1 px-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs transition-colors"
                >
                  Log
                </button>
              </form>
            </div>
            
            {isWeightsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : (
              renderWeightGraph()
            )}
          </div>
        </div>

        {/* Right Column: AI Calorie scanner preview & macros targets */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          
          {/* AI Food Scanner */}
          <div>
            <h3 className="font-bold text-sm mb-0.5 flex items-center gap-1.5">
              <Sparkles size={16} className="text-primary animate-pulse" /> AI Calorie Scanner
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Upload meal images for instant visual estimations</p>
            
            <div className="space-y-4">
              {!scanPreview ? (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl cursor-pointer bg-secondary/15 hover:bg-secondary/40 transition-all p-4">
                  <Camera size={24} className="text-muted-foreground mb-1.5 opacity-60" />
                  <span className="text-[10px] font-bold text-foreground">Click to upload meal photo</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">Supports PNG, JPG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFoodPhotoUpload} />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-32 rounded-xl overflow-hidden border border-border">
                    <img src={scanPreview} alt="Scanned food" className="w-full h-full object-cover" />
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1.5">
                        <Loader2 className="animate-spin" size={16} /> Scanning photo...
                      </div>
                    )}
                  </div>
                  
                  {scannedData && (
                    <div className="p-3 bg-secondary/35 border border-border/40 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-foreground truncate max-w-[150px]">{scannedData.food_name}</span>
                        <span className="font-extrabold text-primary shrink-0">{scannedData.calories} kcal</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-muted-foreground font-semibold text-center border-t border-border/30 pt-1.5">
                        <div>P: {scannedData.protein_g}g</div>
                        <div>C: {scannedData.carbs_g}g</div>
                        <div>F: {scannedData.fat_g}g</div>
                      </div>
                      
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleClearScanner}
                          className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleConfirmScannedMeal}
                          className="flex-1 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-[10px] transition-colors"
                        >
                          Confirm & Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Daily macronutrient details */}
          <div className="border-t border-border/80 pt-4 space-y-3.5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today's Macronutrients</h4>
            <div className="space-y-3.5">
              {renderMacroProgress("Protein Target", summary?.macro_totals?.protein ?? 0, 130, "bg-emerald-500")}
              {renderMacroProgress("Carbs Target", summary?.macro_totals?.carbs ?? 0, 250, "bg-primary")}
              {renderMacroProgress("Fat Target", summary?.macro_totals?.fat ?? 0, 70, "bg-rose-400")}
            </div>
          </div>

        </div>

      </div>

      {/* Operation Logs Detail Panel */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Tabs selector */}
        <div className="flex border-b border-border bg-card/60 backdrop-blur">
          {["meals", "workouts", "weights"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all
                ${activeTab === tab
                  ? "border-primary text-primary bg-secondary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                }`}
            >
              {tab === "meals" ? "Daily Calorie Log" : tab === "workouts" ? "Workout Logs" : "Weight Logs"}
            </button>
          ))}
        </div>

        {/* Tab body contents */}
        <div className="p-6 min-h-[300px]">
          
          {/* TAB 1: CALORIE MEALS */}
          {activeTab === "meals" && (
            <div className="space-y-4">
              {/* Past-day calories bar chart toggle */}
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {showCalorieHistory ? "Past 7 Days" : "Today"}
                </h4>
                <button
                  onClick={() => setShowCalorieHistory((prev) => !prev)}
                  className="py-1.5 px-3 bg-secondary hover:bg-secondary/85 border border-border text-foreground font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors"
                >
                  <BarChart3 size={13} />
                  {showCalorieHistory ? "Hide Past Days" : "Past Day Calories"}
                </button>
              </div>

              {showCalorieHistory && (
                <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl">
                  {renderCaloriesBarChart()}
                </div>
              )}

              {isMealsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : !meals || meals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Utensils size={32} className="opacity-40 mb-2" />
                  No food logged today. Start logging calories to track target budgets!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meals.map((m: any) => (
                    <div key={m.id} className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex gap-4 items-center group relative">
                      <button
                        onClick={() => handleDeleteMeal(m.id)}
                        className="absolute top-2.5 right-2.5 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                      
                      {/* Image preview (local mock path link check) */}
                      <div className="w-12 h-12 bg-secondary/60 rounded-lg flex items-center justify-center text-muted-foreground overflow-hidden shrink-0 border border-border">
                        {m.image_path ? (
                          <img src={`${IMAGE_SERVER_BASE}${m.image_path}`} alt="Food preview" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage size={18} className="opacity-50" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline pr-4">
                          <h4 className="font-bold text-xs capitalize text-foreground truncate">{m.food_name}</h4>
                          <span className="text-xs font-black text-foreground shrink-0">{m.calories} kcal</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5 font-medium">{m.meal_type}</p>
                        <div className="flex gap-3 text-[9px] text-muted-foreground font-semibold mt-1">
                          <span>P: {m.protein_g}g</span>
                          <span>C: {m.carbs_g}g</span>
                          <span>F: {m.fat_g}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORKOUT LOGS */}
          {activeTab === "workouts" && (
            <div className="space-y-4">
              {isWorkoutsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : !workouts || workouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Dumbbell size={32} className="opacity-40 mb-2" />
                  No exercise logs found. Time to hit the gym!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Exercise Class</th>
                        <th className="py-2.5">Duration</th>
                        <th className="py-2.5">Burned Calories</th>
                        <th className="py-2.5 hidden sm:table-cell">Notes</th>
                        <th className="py-2.5 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workouts.map((w: any) => (
                        <tr key={w.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 font-bold text-foreground capitalize">{w.exercise_type}</td>
                          <td className="py-2.5 font-semibold text-foreground">{w.duration_minutes} mins</td>
                          <td className="py-2.5 font-bold text-emerald-500">-{w.calories_burned.toFixed(0)} kcal</td>
                          <td className="py-2.5 text-muted-foreground max-w-[180px] truncate hidden sm:table-cell">
                            {w.notes || "—"}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteWorkout(w.id)}
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

          {/* TAB 3: WEIGHT HISTORY */}
          {activeTab === "weights" && (
            <div className="space-y-4">
              {isWeightsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : !weights || weights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Activity size={32} className="opacity-40 mb-2" />
                  No body weight history logged.
                </div>
              ) : (
                <div className="max-w-md">
                  <div className="divide-y divide-border/40 border-b border-border/40">
                    {[...weights].reverse().map((w: any) => (
                      <div key={w.id} className="py-3 flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-extrabold text-foreground">{w.weight_kg.toFixed(1)} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Workout logging dialog */}
      <WorkoutModal isOpen={isWorkoutOpen} onClose={() => setIsWorkoutOpen(false)} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["fitnessWorkouts"] });
        queryClient.invalidateQueries({ queryKey: ["fitnessSummary"] });
      }} />

      {/* Meal logging dialog */}
      <MealModal
        isOpen={isMealOpen}
        onClose={() => {
          setIsMealOpen(false);
          setPrefillMeal(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["fitnessMeals"] });
          queryClient.invalidateQueries({ queryKey: ["fitnessSummary"] });
          handleClearScanner(); // clear scan once committed
        }}
        prefillData={prefillMeal}
      />

    </div>
  );
};
