import Link from "next/link";
import { LocalizedStatusCard } from "@/app/components/LocalizedStatusCard";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header" aria-label="Site header">
        <Link href="/" className="brand" aria-label="roylab home">
          roylab
        </Link>
      </header>

      <main className="home-layout">
        <aside className="banner-zone banner-zone-left" aria-hidden="true" />
        <div className="center-stage">
          <LocalizedStatusCard />
        </div>
        <aside className="banner-zone banner-zone-right" aria-hidden="true" />
      </main>

      <footer className="site-footer">
        <a href="mailto:royjeong1460@gmail.com">royjeong1460@gmail.com</a>
      </footer>
    </div>
  );
}
