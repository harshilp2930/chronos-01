import { Satellite } from "lucide-react";
import Link from "next/link";
import AppPageLayout from "@/components/shared/AppPageLayout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppPageLayout>
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 text-[#F0F4FF]">

      {/* Logo — top-left */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-sm font-mono text-cyan-400/80 hover:text-cyan-400 transition-colors"
      >
        <Satellite className="w-4 h-4" />
        CHRONOS-1
      </Link>

      {/* Decorative avatar — bottom-left */}
      <div className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-sm font-bold text-white/70 select-none">
        N
      </div>

        <div className="w-full max-w-125">{children}</div>
      </div>
    </AppPageLayout>
  );
}
