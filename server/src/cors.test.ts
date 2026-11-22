import { describe, expect, it } from "vitest";
import { originMatcher, parseOrigins } from "./cors";

describe("parseOrigins", () => {
  it("separa por vírgula, remove espaços e barra final", () => {
    expect(parseOrigins(" https://a.com/ , https://b.com")).toEqual(["https://a.com", "https://b.com"]);
    expect(parseOrigins(undefined)).toEqual(["http://localhost:5173"]);
  });
});

describe("originMatcher", () => {
  const allowed = originMatcher(["https://tanquei.vercel.app", "https://tanquei-*-mellodico.vercel.app"]);

  it.each([
    "https://tanquei.vercel.app",
    "https://tanquei-a1b2c3d4e-mellodico.vercel.app",
    "https://tanquei-git-feature-x-mellodico.vercel.app",
  ])("aceita %s", (origin) => expect(allowed(origin)).toBe(true));

  it.each([
    "https://tanquei-x-mellodico.vercel.app.evil.com",
    "https://tanquei-x.evil.com-mellodico.vercel.app",
    "http://tanquei-a1b2-mellodico.vercel.app",
    "https://outro-a1b2-mellodico.vercel.app",
    "https://tanquei--mellodico.vercel.app",
    "https://evil.com",
  ])("recusa %s", (origin) => expect(allowed(origin)).toBe(false));
});
