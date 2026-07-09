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
    title: "준비중",
    description: "Roy의 실험, 제품, 작업들을 차분히 정리하고 있어요.",
  },
  en: {
    title: "Coming soon",
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
    </section>
  );
}
