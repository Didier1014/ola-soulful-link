import { afterEach, describe, expect, it, vi } from "vitest";
import { paystackRequest } from "./paystack.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Paystack account-wide split", () => {
  it("sends the approved split for all initializations, overriding caller splits", async () => {
    vi.stubEnv("STRIPE_LIVE_API_KEY", "test-provider-key");
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ status: true, data: { access_code: "test-access" } })));
    vi.stubGlobal("fetch", fetchMock);

    for (const split of [undefined, "SPL_other"]) {
      await paystackRequest("/transaction/initialize", { amount: "30000", currency: "ZAR", ...(split ? { split_code: split } : {}) });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(JSON.parse(options.body)).toEqual({ amount: "30000", currency: "ZAR", split_code: "SPL_73WGtTcz2N" });
      expect(options.headers.Authorization).toBe('Bearer test-provider-key');
      expect(options.headers).not.toHaveProperty('X-Connection-Api-Key');
    }
  });

  it("keeps payment verification read-only", async () => {
    vi.stubEnv("STRIPE_LIVE_API_KEY", "test-provider-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, data: { status: "success" } })));
    vi.stubGlobal("fetch", fetchMock);
    await paystackRequest("/transaction/verify/rdx-test");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/transaction/verify/rdx-test"), expect.objectContaining({ method: "GET" }));
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });
  it('never falls back to credentials of the previous account', async () => {
    vi.stubEnv('STRIPE_LIVE_API_KEY', '');
    vi.stubEnv('UDC_PAYSTACK_API_KEY', 'old-connection');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(paystackRequest('/transaction/verify/rdx-test')).rejects.toThrow('configurada');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});