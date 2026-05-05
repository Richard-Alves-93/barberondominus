import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ variant = "dark" }: { variant?: "dark" | "light" }) => {
  const text = variant === "dark" ? "text-foreground" : "text-white";
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow group-hover:scale-105 transition-transform">
        <Scissors className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-extrabold text-lg ${text}`}>Barber<span className="text-accent">On</span></span>
        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Gestão Inteligente</span>
      </div>
    </Link>
  );
};
