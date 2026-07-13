import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { X, Loader2 } from "lucide-react";

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXERCISE_TYPES = ["Cardio Training", "Strength & Weights", "Running / Walking", "Yoga & Flexibility", "Swimming", "Others"];

export const WorkoutModal: React.FC<WorkoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [exerciseType, setExerciseType] = useState(EXERCISE_TYPES[0]);
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExerciseType(EXERCISE_TYPES[0]);
      setDuration("");
      setCalories("");
      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setDate(localDate.toISOString().slice(0, 16));
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-calculate rough calories based on duration and exercise type as user types!
  // This is a premium UX micro-animation detail.
  const handleDurationChange = (val: string) => {
    setDuration(val);
    if (!val || isNaN(parseInt(val))) {
      setCalories("");
      return;
    }
    const mins = parseInt(val);
    let met = 6; // Metabolic equivalent multiplier
    if (exerciseType.startsWith("Strength")) met = 4.5;
    if (exerciseType.startsWith("Running")) met = 9.8;
    if (exerciseType.startsWith("Yoga")) met = 2.5;
    
    // rough calculation: METs * 3.5 * bodyWeight(80kg) / 200 * mins
    const estCals = Math.round(met * 3.5 * 80 / 200 * mins);
    setCalories(estCals.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || parseInt(duration) <= 0) {
      setError("Please specify a valid duration greater than 0");
      return;
    }
    if (!calories || parseFloat(calories) < 0) {
      setError("Please specify valid calories burned");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      exercise_type: exerciseType,
      duration_minutes: parseInt(duration),
      calories_burned: parseFloat(calories),
      date: new Date(date).toISOString(),
      notes: notes.trim() || null,
    };

    try {
      await api.post("/fitness/workouts", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Something went wrong while logging the workout."
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
          <h3 className="font-bold text-lg">Log Workout Activity</h3>
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
              Activity Type
            </label>
            <select
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
            >
              {EXERCISE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                required
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>

            {/* Calories Burned */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Calories Burned (kcal)
              </label>
              <input
                type="number"
                required
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="e.g. 200"
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Workout Timestamp
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Workout Notes / Details (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bench press: 4 sets of 8 reps"
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
              Save Activity
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
