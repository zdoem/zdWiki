import React, { useEffect } from "react";
import { getTypeIcon } from "./icons";

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "brass" | "ghost" | "outline" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "brass",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  };

  const variants = {
    brass: "bg-brass hover:bg-brass-dark text-canvas font-semibold shadow-sm hover:shadow active:scale-[0.98]",
    primary: "bg-cyan hover:bg-cyan/90 text-canvas font-semibold shadow-sm hover:shadow active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-surfaceHighlight text-textMain hover:text-white",
    outline: "border border-borderSubtle hover:border-brass/50 bg-surface/50 hover:bg-surfaceHighlight text-textMain",
    subtle: "bg-surfaceElevated hover:bg-surfaceHighlight text-textMain border border-hairline",
    danger: "bg-rose/20 text-rose border border-rose/40 hover:bg-rose/30",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

// --- BADGE ---
export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "brass" | "cyan" | "emerald" | "rose" | "purple" | "outline" | "mono";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  className = "",
  icon,
}) => {
  const base = "inline-flex items-center font-medium rounded-md select-none";
  const sizes = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const variants = {
    default: "bg-surfaceHighlight text-textMuted border border-hairline",
    brass: "bg-brass/15 text-brass border border-brass/30",
    cyan: "bg-cyan/15 text-cyan border border-cyan/30",
    emerald: "bg-emerald/15 text-emerald border border-emerald/30",
    rose: "bg-rose/15 text-rose border border-rose/30",
    purple: "bg-purple/15 text-purple border border-purple/30",
    outline: "border border-borderSubtle text-textMuted",
    mono: "font-mono bg-surfaceElevated text-textMain border border-hairline text-[11px]",
  };

  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

// --- TYPE BADGE ---
export const TypeBadge: React.FC<{ type: string; size?: "sm" | "md"; className?: string }> = ({
  type,
  size = "sm",
  className = "",
}) => {
  const icon = getTypeIcon(type, { size: size === "sm" ? 12 : 14 });
  const formattedType = type.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border border-hairline bg-surfaceElevated text-textMain uppercase ${className}`}>
      <span className="text-brass shrink-0">{icon}</span>
      <span className="text-[10px] tracking-tight">{formattedType}</span>
    </span>
  );
};

// --- LIFECYCLE BADGE ---
export const LifecycleBadge: React.FC<{ status?: string; size?: "sm" | "md"; className?: string }> = ({
  status = "current",
  size = "sm",
  className = "",
}) => {
  const s = status.toLowerCase();
  let variant: BadgeProps["variant"] = "default";
  if (s === "current") variant = "emerald";
  else if (s === "deprecated") variant = "rose";
  else if (s === "superseded") variant = "purple";
  else if (s === "legacy") variant = "brass";
  else if (s === "draft") variant = "outline";

  return (
    <Badge variant={variant} size={size} className={className}>
      {s.toUpperCase()}
    </Badge>
  );
};

// --- PANEL CONTAINER ---
export const Panel: React.FC<{
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, badge, actions, children, className = "" }) => (
  <div className={`panel ${className}`}>
    {(title || badge || actions) && (
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            {title && <h2 className="font-heading font-semibold text-base text-textMain">{title}</h2>}
            {badge}
          </div>
          {subtitle && <p className="text-xs text-textDim font-mono mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

// --- CARD ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}> = ({ children, className = "", onClick, hoverable = false }) => (
  <div
    onClick={onClick}
    className={`bg-surface/80 border border-hairline rounded-lg p-4 transition-all duration-150 ${
      hoverable || onClick ? "hover:border-brass/40 hover:bg-surfaceElevated cursor-pointer active:scale-[0.99]" : ""
    } ${className}`}
  >
    {children}
  </div>
);

// --- KBD ---
export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <kbd className={`kbd ${className}`}>{children}</kbd>;

// --- SCORE BAR ---
export const ScoreBar: React.FC<{ score: number; max?: number; label?: string }> = ({
  score,
  max = 10,
  label,
}) => {
  const pct = Math.min(Math.max((score / max) * 100, 5), 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      {label && <span className="text-textDim text-[11px] font-mono">{label}</span>}
      <div className="w-16 h-1.5 bg-surfaceElevated rounded-full overflow-hidden border border-hairline">
        <div
          className="h-full bg-gradient-to-r from-brass to-cyan rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-brass text-[11px] font-semibold">{score.toFixed(2)}</span>
    </div>
  );
};

// --- PROGRESS BAR ---
export const ProgressBar: React.FC<{ value: number; max?: number; color?: string; label?: string }> = ({
  value,
  max = 100,
  color = "bg-brass",
  label,
}) => {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs font-mono text-textMuted mb-1">
          <span>{label}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-hairline">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// --- MODAL / DIALOG ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/80 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidth} bg-surfaceElevated border border-hairline shadow-2xl rounded-xl overflow-hidden z-10 animate-in zoom-in-95 duration-150`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface/50">
            <h2 className="font-heading font-semibold text-lg text-textMain">{title}</h2>
            <button
              onClick={onClose}
              className="text-textDim hover:text-textMain p-1.5 rounded-lg hover:bg-surfaceHighlight transition-colors"
              aria-label="Close modal"
            >
              {/* Pure Inline SVG Close X */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
