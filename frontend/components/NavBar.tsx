"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SquarePlus, Menu, X, Satellite } from "lucide-react";
import Link from "next/link";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Model", href: "#model" },
    { label: "Built With", href: "#built-with" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-space-600/60 bg-space-900/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex select-none items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
              <Satellite className="h-4 w-4" style={{ color: "#00E5FF" }} />
            </div>

            <div className="flex flex-col leading-none">
              <span className="font-space text-3xl font-black tracking-tight text-white">
                CHRONOS<span className="text-neon-blue">-1</span>
              </span>
              <span className="-mt-0.5 font-mono text-[9px] tracking-[0.25em] text-slate-500">
                LAUNCH INTELLIGENCE
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setActiveLink(link.label)}
                className="relative px-4 py-2 text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-white"
              >
                {link.label}
                <motion.span
                  className="absolute right-4 bottom-0 left-4 h-px rounded-full bg-neon-blue"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeLink === link.label ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/auth/register"
              className="flex items-center gap-2 rounded-lg bg-linear-to-r from-neon-blue to-cyan-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(79,142,247,0.4)]"
            >
              <SquarePlus size={14} />
              Create
            </Link>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-600 text-slate-400 transition-all hover:border-neon-blue/50 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <div
          className={`h-px transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-100"}`}
          style={{
            background:
              "linear-gradient(90deg, transparent, #4f8ef740, #06b6d440, transparent)",
          }}
        />
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 flex flex-col gap-2 border-b border-space-600 bg-space-900/95 px-6 py-4 backdrop-blur-md md:hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => {
                  setActiveLink(link.label);
                  setMobileOpen(false);
                }}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-space-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-space-600" />
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-neon-blue to-cyan-500 px-4 py-3 text-sm font-medium text-white"
            >
              <SquarePlus size={14} /> Create
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
