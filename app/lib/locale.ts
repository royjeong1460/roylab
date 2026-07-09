export type DisplayLocale = "ko" | "en";

export function resolveDisplayLocale(
  languages?: readonly string[] | string | null,
): DisplayLocale {
  const preferredLanguages =
    typeof languages === "string" ? [languages] : languages ?? [];

  return preferredLanguages.some((language) =>
    language.trim().toLowerCase().startsWith("ko"),
  )
    ? "ko"
    : "en";
}
