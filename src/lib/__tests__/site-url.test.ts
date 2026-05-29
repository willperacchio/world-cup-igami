import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSiteUrl } from "../site-url";

describe("getSiteUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the localhost fallback when no envs are set", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("uses VERCEL_URL when available", () => {
    process.env.VERCEL_URL = "wcg-abc123.vercel.app";
    expect(getSiteUrl()).toBe("https://wcg-abc123.vercel.app");
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL", () => {
    process.env.VERCEL_URL = "preview.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "worldcupigami.vercel.app";
    expect(getSiteUrl()).toBe("https://worldcupigami.vercel.app");
  });

  it("uses NEXT_PUBLIC_SITE_URL as the highest-priority override", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://worldcupigami.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "worldcupigami.vercel.app";
    expect(getSiteUrl()).toBe("https://worldcupigami.com");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://worldcupigami.com/";
    expect(getSiteUrl()).toBe("https://worldcupigami.com");
  });
});
