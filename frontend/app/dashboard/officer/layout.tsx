"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OfficerNavbar } from "@/components/officer/navbar";
import AppPageLayout from "@/components/shared/AppPageLayout";

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const router   = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    } else if (user.role !== "officer") {
      // Planners/individuals cannot access officer routes
      router.push("/dashboard/planner");
    }
  }, [user, router]);

  if (!user || user.role !== "officer") return null;

  return (
    <AppPageLayout>
      <div className="relative z-10 flex min-h-screen flex-1 flex-col text-[#F0F4FF]">
        <OfficerNavbar />
        <main className="mx-auto w-full max-w-350 flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </AppPageLayout>
  );
}
