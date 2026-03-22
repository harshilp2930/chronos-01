"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlannerNavbar } from "@/components/planner/navbar";
import AppPageLayout from "@/components/shared/AppPageLayout";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const router   = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    } else if (user.role === "officer") {
      // Officers cannot access planner routes
      router.push("/dashboard/officer");
    }
  }, [user, router]);

  if (!user || user.role === "officer") return null;

  return (
    <AppPageLayout>
      <div className="relative z-10 flex min-h-screen flex-1 flex-col text-[#F0F4FF]">
        <PlannerNavbar />
        <main className="mx-auto w-full max-w-350 flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </AppPageLayout>
  );
}
