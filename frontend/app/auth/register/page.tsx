"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Shield, Map, User, Eye, EyeOff } from "lucide-react";
import { PremiumCard } from "@/components/ui/card-with-noise-pattern";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthStore, type UserRole } from "@/store/auth";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["officer", "planner", "individual"] as const),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const ROLES: {
  value: UserRole;
  label: string;
  description: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  border: { sel: string; selBorder: string; selText: string };
}[] = [
  {value: "officer", label: "Range Safety Officer", description: "Full system access · Approve missions · Override authority",
    icon: Shield, color: "#0066FF", border: { sel: "rgba(0,102,255,0.15)", selBorder: "rgba(0,102,255,0.5)", selText: "#F0F4FF" } },
  {value: "planner", label: "Mission Planner", description: "Design trajectories · Run optimizations · Submit for review",
    icon: Map, color: "#00E5FF", border: { sel: "rgba(0,229,255,0.1)", selBorder: "rgba(0,229,255,0.4)", selText: "#F0F4FF" } },
  {value: "individual", label: "Individual Operator", description: "Personal mission planning · Hobbyist & small launches",
    icon: User, color: "#00C896", border: { sel: "rgba(0,200,150,0.1)", selBorder: "rgba(0,200,150,0.4)", selText: "#F0F4FF" } },
];

const ROLE_PATHS: Record<string, string> = {
  officer: "/dashboard/officer",
  planner: "/dashboard/planner",
  individual: "/dashboard/planner",
};

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, clearError, isLoading, user } = useAuthStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Redirect already-authenticated users
  useEffect(() => {
    if (user) {
      const paths: Record<string, string> = {
        officer: "/dashboard/officer",
        planner: "/dashboard/planner",
        individual: "/dashboard/planner",
      };
      router.replace(paths[user.role] ?? "/dashboard/planner");
    }
  }, [user, router]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "planner",
    },
  });

  // form.watch("role") is used inside the FormField render via field.value

  const onSubmit = async (values: RegisterForm) => {
    setSubmitError(null);
    clearError();
    try {
      await register({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        confirm_password: values.confirmPassword,
        role: values.role,
      });
      const role = useAuthStore.getState().user?.role ?? "planner";
      router.push(ROLE_PATHS[role] ?? "/dashboard/planner");
    } catch {
      setSubmitError(useAuthStore.getState().error || "Registration failed. Please try again.");
    }
  };

  const displayError = submitError || error;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <PremiumCard>
          <div className="space-y-1 p-8 pb-6">
            <h2 className="text-[24px] font-bold tracking-tight" style={{ color: "#F0F4FF" }}>Create account</h2>
            <p className="text-[13px] font-['JetBrains_Mono',monospace]" style={{ color: "rgba(240,244,255,0.4)" }}>Join CHRONOS-1 to start planning missions</p>
          </div>

          <div className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Role selector */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-medium" style={{ color: "rgba(240,244,255,0.6)" }}>Operator Type</FormLabel>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {ROLES.map((role) => {
                        const isSelected = field.value === role.value;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => field.onChange(role.value)}
                            className="flex items-start gap-3 rounded-lg p-3 text-left transition-all duration-200"
                            style={{
                              background: isSelected ? role.border.sel : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isSelected ? role.border.selBorder : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            <role.icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: isSelected ? role.color : "rgba(240,244,255,0.3)" }} />
                            <div>
                              <p className="text-sm font-medium" style={{ color: isSelected ? role.border.selText : "rgba(240,244,255,0.5)" }}>{role.label}</p>
                              <p className="text-xs mt-0.5" style={{ color: "rgba(240,244,255,0.3)" }}>{role.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage className="text-xs" style={{ color: "#FF3B5C" }} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-medium" style={{ color: "rgba(240,244,255,0.6)" }}>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Commander Jane Doe"
                        autoComplete="name"
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

              <div className="grid grid-cols-2 gap-3">
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
                            autoComplete="new-password"
                            className="h-[42px] rounded-lg border-0 pr-10 placeholder:text-[rgba(240,244,255,0.2)] transition-all focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-0"
                            style={{ background: "rgba(255,255,255,0.04)", color: "#F0F4FF", border: "1px solid rgba(255,255,255,0.1)" }}
                            {...field}
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ color: "rgba(240,244,255,0.3)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.7)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.3)")}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: "#FF3B5C" }} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-medium" style={{ color: "rgba(240,244,255,0.6)" }}>Confirm</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="h-[42px] rounded-lg border-0 pr-10 placeholder:text-[rgba(240,244,255,0.2)] transition-all focus-visible:ring-1 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-0"
                            style={{ background: "rgba(255,255,255,0.04)", color: "#F0F4FF", border: "1px solid rgba(255,255,255,0.1)" }}
                            {...field}
                          />
                          <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ color: "rgba(240,244,255,0.3)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.7)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,244,255,0.3)")}>
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: "#FF3B5C" }} />
                    </FormItem>
                  )}
                />
              </div>

              {displayError && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm rounded-md px-3 py-2"
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
                    Creating account…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </form>
          </Form>
          </div>

          <div className="flex justify-center px-8 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "rgba(240,244,255,0.4)" }}>
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium transition-all" style={{ color: "#00E5FF" }}>Sign in</Link>
            </p>
          </div>
      </PremiumCard>
    </motion.div>
  );
}
