import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDisplayLocale } from "../app/lib/locale.ts";

describe("resolveDisplayLocale", () => {
  it("uses Korean when any preferred browser language starts with ko", () => {
    assert.equal(resolveDisplayLocale(["en-US", "ko-KR"]), "ko");
    assert.equal(resolveDisplayLocale("ko"), "ko");
  });

  it("falls back to English for non-Korean or missing language values", () => {
    assert.equal(resolveDisplayLocale(["en-US", "ja-JP"]), "en");
    assert.equal(resolveDisplayLocale([]), "en");
    assert.equal(resolveDisplayLocale(null), "en");
  });
});
