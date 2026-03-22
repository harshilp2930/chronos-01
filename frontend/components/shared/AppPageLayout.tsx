import DotGridBackground from "./DotGridBackground";

interface AppPageLayoutProps {
  children: React.ReactNode;
}

export default function AppPageLayout({ children }: AppPageLayoutProps) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#080E1A" }} className="app-page-bg">
      <DotGridBackground
        spacing={12}
        dotRadius={0.8}
        baseOpacity={0.07}
        glowOpacity={0.75}
        glowRadius={160}
        glowColor="79,142,247"
        dotColor="255,255,255"
      />

      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
    </div>
  );
}
