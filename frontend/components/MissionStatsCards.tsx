import React from "react";
import { FaRocket, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface MissionStatsCardsProps {
  totalMissions: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function MissionStatsCards({
  totalMissions,
  pending,
  approved,
  rejected,
}: MissionStatsCardsProps) {
  const stats = [
    {
      label: "TOTAL MISSIONS",
      value: totalMissions,
      icon: FaRocket,
      iconColor: "#00E6FF",
      textColor: "#00E6FF",
      iconBg: "rgba(0,230,255,0.12)",
    },
    {
      label: "PENDING APPROVAL",
      value: pending,
      icon: FaClock,
      iconColor: "#F5A623",
      textColor: "#F5A623",
      iconBg: "rgba(245,166,35,0.12)",
    },
    {
      label: "APPROVED",
      value: approved,
      icon: FaCheckCircle,
      iconColor: "#00C896",
      textColor: "#00C896",
      iconBg: "rgba(0,200,150,0.12)",
    },
    {
      label: "REJECTED",
      value: rejected,
      icon: FaTimesCircle,
      iconColor: "#FF4D6D",
      textColor: "#FF4D6D",
      iconBg: "rgba(255,77,109,0.12)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
      {stats.map(({ label, value, icon: Icon, iconColor, textColor, iconBg }) => (
        <div
          key={label}
          className="flex flex-row items-center min-w-45 max-w-80 bg-card border border-border rounded-2xl shadow-sm px-5 py-2"
          style={{ minHeight: 90 }}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full mr-4" style={{ background: iconBg }}>
            <Icon size={28} color={iconColor} />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-2xl font-normal leading-tight" style={{ color: textColor }}>{value}</span>
            <span className="text-xs font-medium text-muted-foreground tracking-wide mt-0 uppercase">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
