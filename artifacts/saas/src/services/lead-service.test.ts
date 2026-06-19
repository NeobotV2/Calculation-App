import { describe, it, expect, vi, afterEach } from "vitest";
import { isValidEmail, submitLead, setLeadProvider } from "./lead-service";

afterEach(() => {
  setLeadProvider(null);
});

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("max@firma.de")).toBe(true);
    expect(isValidEmail("a.b-c@sub.example.com")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false); // no TLD
    expect(isValidEmail("a @b.de")).toBe(false); // space
    expect(isValidEmail("")).toBe(false);
  });
});

describe("submitLead", () => {
  it("rejects an invalid email with a user-facing error", async () => {
    const res = await submitLead({ email: "not-an-email" });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("succeeds for a valid email via the local fallback (no provider/Supabase)", async () => {
    const res = await submitLead({ email: "Lead@Firma.de", source: "test" });
    expect(res.ok).toBe(true);
  });

  it("routes to a registered provider and normalizes the email to lowercase", async () => {
    const provider = vi.fn(async () => {});
    setLeadProvider(provider);

    const res = await submitLead({ email: "  MixedCase@Firma.DE  ", source: "test" });
    expect(res.ok).toBe(true);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][0]).toMatchObject({ email: "mixedcase@firma.de", source: "test" });
  });

  it("reports an error when the provider throws", async () => {
    setLeadProvider(async () => {
      throw new Error("boom");
    });
    const res = await submitLead({ email: "valid@firma.de" });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
