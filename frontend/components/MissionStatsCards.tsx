import React from "react";
import { Rocket, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/ui/card-with-noise-pattern";
import { motion } from "framer-motion";

interface MissionStatsCardsProps {
  totalMissions: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  loading?: boolean;
}

export default function MissionStatsCards({
  totalMissions,
  approved,
  rejected,
  approvalRate,
  loading = false,
}: MissionStatsCardsProps) {
  const STAT_CARDS = [
    { key: "total", label: "Total Missions", value: totalMissions, icon: Rocket, accent: "#00E5FF" },
    { key: "approved", label: "Approved", value: approved, icon: CheckCircle2, accent: "#00C896" },
    { key: "rejected", label: "Rejected", value: rejected, icon: XCircle, accent: "#FF3B5C" },
    { key: "rate", label: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, accent: "#3B82F6" },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
      {STAT_CARDS.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <StatTile
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.accent}
            loading={loading}
          />
        </motion.div>
      ))}
    </div>
  );
}
