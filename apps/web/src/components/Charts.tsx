"use client";

import React from "react";
import { getTypeIcon } from "./icons";

interface DistributionChartProps {
  data: Record<string, number>;
  onSelectType?: (type: string) => void;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ data, onSelectType }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div className="space-y-2.5">
      {entries.map(([type, count]) => {
        const pct = (count / maxVal) * 100;
        return (
          <div
            key={type}
            onClick={() => onSelectType && onSelectType(type)}
            className="group flex items-center gap-3 text-xs cursor-pointer hover:opacity-90"
          >
            <div className="w-32 flex items-center gap-2 truncate font-mono text-textMuted group-hover:text-brass transition-colors">
              <span className="text-textDim group-hover:text-brass">{getTypeIcon(type, { size: 14 })}</span>
              <span className="truncate">{type.replace("_", " ")}</span>
            </div>
            <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden border border-hairline p-0.5">
              <div
                className="h-full bg-gradient-to-r from-brass/80 to-brass rounded-full transition-all duration-500 group-hover:brightness-125"
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <div className="w-8 text-right font-mono text-textMain font-semibold">{count}</div>
          </div>
        );
      })}
    </div>
  );
};

export const VerificationBreakdown: React.FC<{ items: Array<{ status: string; count: number }> }> = ({ items }) => {
  const colorMap: Record<string, string> = {
    verified: "bg-emerald text-emerald border-emerald/30",
    tested: "bg-cyan text-cyan border-cyan/30",
    source_backed: "bg-brass text-brass border-brass/30",
    unverified: "bg-textDim text-textDim border-textDim/30",
    disputed: "bg-rose text-rose border-rose/30",
  };

  const total = items.reduce((acc, i) => acc + i.count, 0) || 1;

  return (
    <div className="space-y-3">
      {/* Segmented Bar */}
      <div className="w-full h-3 bg-surface rounded-full overflow-hidden border border-hairline flex">
        {items.map((item) => {
          const pct = (item.count / total) * 100;
          if (pct === 0) return null;
          const bg = colorMap[item.status]?.split(" ")[0] || "bg-brass";
          return (
            <div
              key={item.status}
              className={`h-full ${bg} transition-all duration-300`}
              style={{ width: `${pct}%` }}
              title={`${item.status}: ${item.count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-mono">
        {items.map((item) => {
          const style = colorMap[item.status] || "bg-surfaceHighlight text-textMuted";
          return (
            <div key={item.status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${style.split(" ")[0]}`} />
              <span className="text-textMuted capitalize">{item.status.replace("_", " ")}:</span>
              <span className="text-textMain font-semibold">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
