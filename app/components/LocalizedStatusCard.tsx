"use client";

import { useSyncExternalStore } from "react";
import { resolveDisplayLocale, type DisplayLocale } from "@/app/lib/locale";

const statusCopy: Record<
  DisplayLocale,
  {
    title: string;
    description: string;
  }
> = {
  ko: {
    title: "작은 실험실",
    description: "직접 만져 보고, 플레이하며 만들어 가는 Roy의 실험실입니다.",
  },
  en: {
    title: "Roy’s lab",
    description: "A portfolio for experiments, products, and work taking shape.",
  },
};

function subscribeToLanguageChange(onStoreChange: () => void) {
  window.addEventListener("languagechange", onStoreChange);

  return () => {
    window.removeEventListener("languagechange", onStoreChange);
  };
}

function getBrowserLocaleSnapshot() {
  const browserLanguages =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language;

  return resolveDisplayLocale(browserLanguages);
}

function getServerLocaleSnapshot(): DisplayLocale {
  return "en";
}

export function LocalizedStatusCard() {
  const locale = useSyncExternalStore(
    subscribeToLanguageChange,
    getBrowserLocaleSnapshot,
    getServerLocaleSnapshot,
  );
  const copy = statusCopy[locale];

  return (
    <section className="status-card" aria-label="roylab status">
      <p className="status-eyebrow">roylab</p>
      <h1>{copy.title}</h1>
      <p className="status-subcopy">{copy.description}</p>
      <a className="demo-card" href="/games/planet-patchup/">
        <span className="demo-tag">PLAYABLE DEMO · 01</span>
        <strong>Planet Patchup</strong>
        <span>{locale === "ko" ? "무너뜨리고, 모으고, 더 강하게." : "Break it down. Collect. Upgrade."}</span>
        <b>{locale === "ko" ? "무료 데모 플레이 →" : "Play the free demo →"}</b>
      </a>
    </section>
  );
}
