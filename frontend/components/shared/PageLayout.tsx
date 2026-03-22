import DotGridBackground from "./DotGridBackground";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#0d0d10] text-white">
      <DotGridBackground
        spacing={24}
        dotRadius={1.2}
        dotColor="rgba(255,255,255,0.15)"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
