'use client';

import React from 'react';
import Link from 'next/link';
import { Satellite, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);

	const links = [
		{ label: 'Features', href: '#features' },
		{ label: 'Mission Types', href: '#mission-types' },
		{ label: 'Safety', href: '#safety' },
	];

	return (
		<header
			className={cn(
				'sticky top-5 z-50',
				'mx-auto w-full max-w-4xl rounded-2xl border border-white/12 shadow-lg shadow-black/40',
				'bg-[#02040e]/90 backdrop-blur-lg',
			)}
		>
			<nav className="mx-auto flex items-center justify-between p-2">
				{/* Brand */}
				<Link href="/" className="flex cursor-pointer items-center gap-2 rounded-none px-3 py-1.5 hover:bg-white/5 transition-colors duration-150">
					<Satellite className="size-4 text-cyan-400" />
					<span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
						Chronos‑1
					</span>
				</Link>

				{/* Desktop links */}
				<div className="hidden items-center gap-1 lg:flex">
					{links.map((link) => (
						<a
							key={link.label}
							className={cn(
								buttonVariants({ variant: 'ghost', size: 'sm' }),
								'text-slate-400 hover:text-white font-mono text-xs tracking-wide rounded-none',
							)}
							href={link.href}
						>
							{link.label}
						</a>
					))}
				</div>

				{/* CTA + mobile menu */}
				<div className="flex items-center gap-2">
					<a
						href="/auth/login"
						className={cn(
							buttonVariants({ variant: 'ghost', size: 'sm' }),
							'hidden sm:inline-flex text-slate-400 hover:text-white font-mono text-xs rounded-none',
						)}
					>
						Sign In
					</a>
					<a
						href="/auth/register"
						className={cn(
							buttonVariants({ size: 'sm' }),
							'bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(56,189,248,0.3)] hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all',
						)}
					>
						Get Started
					</a>

					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="outline"
							onClick={() => setOpen(!open)}
							className="lg:hidden rounded-none border-zinc-700/80 bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
						>
							<MenuIcon className="size-4" />
						</Button>
						<SheetContent
							className="border-r border-white/12 bg-[#02040e]/95 backdrop-blur-xl gap-0"
							showClose={false}
							side="left"
						>
							<div className="flex items-center gap-2 px-4 pt-6 pb-4 border-b border-white/10">
								<Satellite className="size-4 text-cyan-400" />
								<span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
									Chronos‑1
								</span>
							</div>
							<div className="grid gap-y-1 overflow-y-auto px-3 pt-4 pb-5">
								{links.map((link) => (
									<a
										key={link.label}
										className={cn(
											buttonVariants({ variant: 'ghost' }),
											'justify-start text-slate-400 hover:text-white font-mono text-sm rounded-none',
										)}
										href={link.href}
										onClick={() => setOpen(false)}
									>
										{link.label}
									</a>
								))}
							</div>
							<SheetFooter className="border-t border-white/10 bg-transparent">
								<a
									href="/auth/login"
									className={cn(
										buttonVariants({ variant: 'outline' }),
										'rounded-none border-zinc-700/80 text-slate-300 hover:text-white hover:bg-white/5 font-mono text-xs',
									)}
								>
									Sign In
								</a>
								<a
									href="/auth/register"
									className={cn(
										buttonVariants({}),
										'rounded-none bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold',
									)}
								>
									Get Started
								</a>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
