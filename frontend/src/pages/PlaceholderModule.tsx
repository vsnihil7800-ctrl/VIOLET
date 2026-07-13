import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

interface PlaceholderProps {
  moduleName: string;
  description: string;
  targetPhase: string;
}

export const PlaceholderModule: React.FC<PlaceholderProps> = ({ moduleName, description, targetPhase }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-xl mx-auto animate-fade-in">
      <div className="relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white relative shadow-lg">
          <Sparkles size={32} className="animate-pulse" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
          Coming in {targetPhase}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          {moduleName} Module
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          {description}
        </p>
      </div>

      <div className="w-full bg-card border border-border/80 rounded-2xl p-6 text-left space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Planned Capabilities</h3>
        <ul className="text-xs space-y-2 text-foreground font-medium">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> End-to-end CRUD REST APIs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Beautiful interactive chart visualizations
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Integrated RAG knowledge base for Violet assistant
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Advanced AI automation & reports
          </li>
        </ul>
      </div>

      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border hover:border-foreground/20 transition-all"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
    </div>
  );
};
