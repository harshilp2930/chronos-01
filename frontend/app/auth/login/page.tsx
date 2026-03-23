"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { PremiumCard } from "@/components/ui/card-with-noise-pattern";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_PATHS: Record<string, string> = {
  officer: "/dashboard/officer",
  planner: "/dashboard/planner",
  individual: "/dashboard/planner",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError, isLoading, user } = useAuthStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Redirect already-authenticated users
  useEffect(() => {
    if (user) {
      const ROLE_PATHS: Record<string, string> = {
        officer: "/dashboard/officer",
        planner: "/dashboard/planner",
        individual: "/dashboard/planner",
      };
      router.replace(ROLE_PATHS[user.role] ?? "/dashboard/planner");
    }
  }, [user, router]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    clearError();
    try {
      await login(values.email, values.password);
      // After login, user is populated — redirect by role
      const role = useAuthStore.getState().user?.role ?? "planner";
      router.push(ROLE_PATHS[role] ?? "/dashboard/planner");
    } catch {
      // getState() gives the freshly updated error from the store action
      setSubmitError(useAuthStore.getState().error || "Invalid email or password.");
    }
  };

  const displayError = submitError || error;
  const [showPassword, setShowPassword] = useState(false);

  const fastLogin = async (email: string, password: string) => {
    setSubmitError(null);
    clearError();
    form.setValue("email", email);
    form.setValue("password", password);
    try {
      await login(email, password);
      const role = useAuthStore.getState().user?.role ?? "planner";
      router.push(ROLE_PATHS[role] ?? "/dashboard/planner");
    } catch {
      setSubmitError(useAuthStore.getState().error || "Invalid email or password.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <PremiumCard>
          {/* Header */}
          <div className="space-y-1 p-8 pb-6">
            <h2 className="text-[24px] font-bold tracking-tight" style={{ color: "#F0F4FF" }}>Welcome back</h2>
            <p className="text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>Sign in to your CHRONOS-1 account</p>
          </div>

          <div className="px-8 pb-8 space-y-5">
            {/* Quick access */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(240,244,255,0.3)" }}>Quick access</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => fastLogin("admin@chronos.dev", "Admin123")}
                  className="h-9 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(240,244,255,0.7)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.7)")}
                >
                  Officer
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => fastLogin("planner@chronos.dev", "Planner123")}
                  className="h-9 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(240,244,255,0.7)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F4FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.7)")}
                >
                  Planner
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-600">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-medium" style={{ color: "rgba(240,244,255,0.6)" }}>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="commander@spaceops.com"
                          autoComplete="email"
                          className="h-[42px] rounded-lg border-0 placeholder:text-[rgba(240,244,255,0.2)] transition-all focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-0"
                          style={{ background: "rgba(255,255,255,0.04)", color: "#F0F4FF", border: "1px solid rgba(255,255,255,0.1)" }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: "#FF3B5C" }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-medium" style={{ color: "rgba(240,244,255,0.6)" }}>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="h-[42px] rounded-lg border-0 pr-10 placeholder:text-[rgba(240,244,255,0.2)] transition-all focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-0"
                            style={{ background: "rgba(255,255,255,0.04)", color: "#F0F4FF", border: "1px solid rgba(255,255,255,0.1)" }}
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ color: "rgba(240,244,255,0.3)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.7)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.3)")}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: "#FF3B5C" }} />
                    </FormItem>
                  )}
                />

                {displayError && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm rounded-lg px-3 py-2"
                    style={{ color: "#FF3B5C", background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.2)" }}
                  >
                    {displayError}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-lg bg-[#00e5ff] hover:brightness-110 text-black font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,229,255,0.3)] hover:shadow-[0_0_36px_rgba(0,229,255,0.45)] disabled:opacity-60 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Authenticating…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="flex justify-center px-8 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>
              No account?{" "}
              <Link href="/auth/register" className="font-medium transition-all" style={{ color: "#00E5FF" }}>
                Create one
              </Link>
            </p>
          </div>
      </PremiumCard>
    </motion.div>
  );
}
