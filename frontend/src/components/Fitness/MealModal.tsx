import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

export interface MealPrefill {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image_path?: string;
}

interface MealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillData?: MealPrefill | null;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export const MealModal: React.FC<MealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillData,
}) => {
  const [mealType, setMealType] = useState(MEAL_TYPES[0]);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [date, setDate] = useState("");
  const [imagePath, setImagePath] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (prefillData) {
        setMealType("lunch"); // default scanner to lunch or let it stay breakfast
        setFoodName(prefillData.food_name);
        setCalories(prefillData.calories.toString());
        setProtein(prefillData.protein_g.toString());
        setCarbs(prefillData.carbs_g.toString());
        setFat(prefillData.fat_g.toString());
        setImagePath(prefillData.image_path || "");
      } else {
        setMealType(MEAL_TYPES[0]);
        setFoodName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setImagePath("");
      }
      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setDate(localDate.toISOString().slice(0, 16));
      setError(null);
    }
  }, [isOpen, prefillData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) {
      setError("Please specify a food name");
      return;
    }
    if (!calories || parseFloat(calories) < 0) {
      setError("Please specify valid calories");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      meal_type: mealType,
      food_name: foodName.trim(),
      calories: parseFloat(calories),
      protein_g: protein ? parseFloat(protein) : 0.0,
      carbs_g: carbs ? parseFloat(carbs) : 0.0,
      fat_g: fat ? parseFloat(fat) : 0.0,
      date: new Date(date).toISOString(),
      image_path: imagePath || null,
    };

    try {
      await api.post("/fitness/meals", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while logging the meal."
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
            {prefillData ? "Confirm Scanned Meal" : "Log Meal Calorie"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Meal Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Meal Schedule
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium capitalize"
              >
                {MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Food Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Food Description
              </label>
              <input
                type="text"
                required
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Avocado Toast"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Calories */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Calories (kcal)
              </label>
              <input
                type="number"
                step="any"
                required
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>

            {/* Protein */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Protein (g)
              </label>
              <input
                type="number"
                step="any"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0g"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Carbs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Carbohydrates (g)
              </label>
              <input
                type="number"
                step="any"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0g"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Fat */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Fats (g)
              </label>
              <input
                type="number"
                step="any"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0g"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Meal Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Image Path display (read-only indicator if scanning) */}
          {imagePath && (
            <div className="text-[10px] text-muted-foreground italic truncate">
              Linked photo: {imagePath}
            </div>
          )}

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
              Confirm Log
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
