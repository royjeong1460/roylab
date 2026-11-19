import Link from "next/link";
import { LocalizedStatusCard } from "@/app/components/LocalizedStatusCard";

import tabs from "@/app/lib/site-tabs.json";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header home-header" aria-label="Site header">
        <Link href="/" className="brand" aria-label="roylab home">
          roylab
        </Link>
        <nav className="lab-tabs" aria-label="로이랩 메뉴" lang="ko">
          {tabs.map((tab) => (
            <a key={tab.id} href={tab.href} data-section={tab.id} aria-current={tab.id === "lab" ? "page" : undefined}>
              {tab.label}
            </a>
          ))}
        </nav>
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
