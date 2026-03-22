"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { ReferenceCatalog } from "@/components/reference-catalog";

export default function OfficerReferencePage() {
  const { user } = useAuthStore();
  const router   = useRouter();

  useEffect(() => {
    if (!user) router.push("/auth/login");
  }, [user, router]);

  return (
    <main className="min-h-screen" style={{ background: "#080E1A" }}>
      <div className="max-w-350 mx-auto px-6 md:px-8 py-8 space-y-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}
          >
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "#F0F4FF" }}>
              Mission Reference
            </h1>
            <p className="text-[13px]" style={{ color: "rgba(240,244,255,0.45)" }}>
              Specifications for target bodies, launch facilities, vehicle classes, and orbit types
            </p>
          </div>
        </motion.div>

        <ReferenceCatalog />
      </div>
    </main>
  );
}
