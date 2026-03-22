"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Satellite,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
  Moon,
  ChevronDown,
  ShieldCheck,
  Menu,
  X,
  User,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard/officer",            label: "Overview",  icon: LayoutDashboard, exact: true },
  { href: "/dashboard/officer/missions",   label: "Missions",  icon: ClipboardList },
  { href: "/dashboard/officer/users",      label: "Users",     icon: Users },
  { href: "/dashboard/officer/analytics",  label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/officer/reference",  label: "Reference", icon: BookOpen },
];

export function OfficerNavbar() {
  const { user, logout } = useAuthStore();
  const router           = useRouter();
  const pathname         = usePathname();
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); router.push("/"); };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className="sticky top-0 z-50 h-14 flex items-center border-b border-[rgba(255,255,255,0.06)]"
      style={{ background: "rgba(8,14,26,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-[1400px] mx-auto px-8 w-full flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/dashboard/officer" className="flex items-center gap-2 shrink-0">
          <Satellite className="w-4 h-4" style={{ color: "#00E5FF" }} />
          <span className="font-bold text-sm tracking-wide" style={{ color: "#00E5FF" }}>CHRONOS-1</span>
          <span className="text-[rgba(240,244,255,0.2)] mx-2 hidden sm:inline">|</span>
          <ShieldCheck className="w-3.5 h-3.5 hidden sm:inline" style={{ color: "rgba(240,244,255,0.5)" }} />
          <span className="text-sm hidden sm:inline" style={{ color: "rgba(240,244,255,0.5)" }}
          >
            Range Safety Officer
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] transition-all duration-150",
                  active
                    ? "text-[#00E5FF] bg-[rgba(0,229,255,0.06)]"
                    : "text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF] hover:bg-[rgba(255,255,255,0.04)]",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && (
                  <span className="ml-0.5 w-1 h-1 rounded-full" style={{ background: "#00E5FF" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            title="Dark mode active"
          >
            <Moon className="w-4 h-4" style={{ color: "rgba(240,244,255,0.5)" }} />
          </button>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: "rgba(0,229,255,0.15)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "#00E5FF",
                }}
              >
                {user?.full_name?.charAt(0) ?? "O"}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate" style={{ color: "rgba(240,244,255,0.7)" }}>
                {user?.full_name}
              </span>
              <ChevronDown className="w-3 h-3" style={{ color: "rgba(240,244,255,0.3)" }} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-xl z-20 py-1 overflow-hidden"
                  style={{ background: "#131F2E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs font-semibold truncate" style={{ color: "#F0F4FF" }}>{user?.full_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "rgba(240,244,255,0.4)" }}>{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] uppercase tracking-widest font-['JetBrains_Mono',monospace]" style={{ color: "#00E5FF" }}>
                      <ShieldCheck className="w-3 h-3" /> Officer
                    </span>
                  </div>
                  <Link
                    href="/dashboard/officer/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                    style={{ color: "rgba(240,244,255,0.6)" }}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-[rgba(255,59,92,0.08)]"
                    style={{ color: "#FF3B5C" }}
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            onClick={() => setMobileMenuOpen((o) => !o)}
            style={{ color: "rgba(240,244,255,0.6)" }}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden absolute top-14 inset-x-0 border-b px-4 py-2 space-y-0.5"
          style={{ background: "rgba(8,14,26,0.95)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive(href, exact)
                  ? "bg-[rgba(0,229,255,0.06)] text-[#00E5FF]"
                  : "text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF] hover:bg-[rgba(255,255,255,0.04)]",
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
