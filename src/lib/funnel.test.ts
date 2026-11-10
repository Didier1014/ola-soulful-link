import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigin, funnelInputSchema, safePath, funnelConfigSchema } from "./funnel";
const event = { event_id: "00000000-0000-4000-8000-000000000001", event: "quiz_complete", path: "/quiz" };
const input = { funnel_id: "00000000-0000-4000-8000-000000000002", events: [event] };
describe("external funnel protections", () => {
  it("accepts quiz completion", () => assert.equal(funnelInputSchema.parse(input).events[0].event, "quiz_complete"));
  it("accepts VSL completion", () => assert.equal(funnelInputSchema.parse({ ...input, events: [{ ...event, event: "vsl_complete" }] }).events[0].event, "vsl_complete"));
  it("rejects browser sale claims", () => assert.equal(funnelInputSchema.safeParse({ ...input, events: [{ ...event, event: "paid" }] }).success, false));
  it("requires exact registered origin", () => { assert.equal(allowedOrigin("https://funnel.test", "https://funnel.test"), true); assert.equal(allowedOrigin("https://evil.test", "https://funnel.test"), false); });
  it("removes query personal data from paths", () => assert.equal(safePath("/quiz?email=person@example.com#answer"), "/quiz"));
  it("never forwards field contents", () => { const parsed=funnelInputSchema.parse({ ...input, email:"secret", events:[{...event,answers:["private"]}] }); assert.equal("email" in parsed,false); assert.equal("answers" in parsed.events[0],false); });
  it("defaults to consent required", () => assert.equal(funnelConfigSchema.parse({name:"Funil",origin:"https://funnel.test"}).consent_required,true));
});