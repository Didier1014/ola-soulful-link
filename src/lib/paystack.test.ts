import { afterEach, describe, expect, it, vi } from "vitest";
import { paystackRequest } from "./paystack.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Paystack account-wide split", () => {
  it("sends the approved split for all initializations, overriding caller splits", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-gateway-key");
    vi.stubEnv("UDC_PAYSTACK_API_KEY", "test-connection-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, data: { access_code: "test-access" } })));
    vi.stubGlobal("fetch", fetchMock);

    for (const split of [undefined, "SPL_other"]) {
      await paystackRequest("/transaction/initialize", { amount: "30000", currency: "ZAR", ...(split ? { split_code: split } : {}) });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(JSON.parse(options.body)).toEqual({ amount: "30000", currency: "ZAR", split_code: "SPL_fO36PDxvUk" });
    }
  });

  it("keeps payment verification read-only", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-gateway-key");
    vi.stubEnv("UDC_PAYSTACK_API_KEY", "test-connection-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, data: { status: "success" } })));
    vi.stubGlobal("fetch", fetchMock);
    await paystackRequest("/transaction/verify/rdx-test");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/transaction/verify/rdx-test"), expect.objectContaining({ method: "GET" }));
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });
});