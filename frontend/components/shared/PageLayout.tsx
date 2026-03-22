import DotGridBackground from "./DotGridBackground";

interface PageLayoutProps {
  children: React.ReactNode;
  dotFade?: "left" | "right" | "center" | "radial";
}

export default function PageLayout({ children, dotFade = "left" }: PageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#0d0d10] text-white">
      <DotGridBackground
        fadeDirection={dotFade}
        spacing={24}
        dotRadius={1.2}
        dotColor="rgba(255,255,255,0.15)"
        parallax={true}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
