import { test } from "node:test";
import { strict as assert } from "node:assert";
import { hexmoSendSms } from "./hexmo.server";

test("SMS uses ESHOP and normalizes Mozambique numbers through MozeSMS", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env['LOVABLE_API_KEY'];
  const originalConnection = process.env['UDC_MOZESMS_API_KEY'];
  process.env['LOVABLE_API_KEY'] = 'test-only';
  process.env['UDC_MOZESMS_API_KEY'] = 'test-only';
  const bodies: unknown[] = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith('https://connector-gateway.lovable.dev/udc_mozesms/sms/'));
    bodies.push(JSON.parse(String(options?.body)));
    return Response.json({ success: true, data: { status: 'enviado' } });
  };
  try {
    assert.equal((await hexmoSendSms({ recipient: '845888195', message: 'Teste', sender_id: 'Outro' })).ok, true);
    assert.deepEqual(bodies[0], { phone: '258845888195', message: 'Teste', sender_id: 'ESHOP' });
    await hexmoSendSms({ recipient: '845888195,865888195', message: 'Teste', sender_id: 'Outro' });
    assert.deepEqual(bodies[1], { sender_id: 'ESHOP', messages: [
      { phone: '258845888195', message: 'Teste' }, { phone: '258865888195', message: 'Teste' },
    ] });
    globalThis.fetch = async () => Response.json({ success: false }, { status: 200 });
    assert.equal((await hexmoSendSms({ recipient: '845888195', message: 'Teste', sender_id: 'ESHOP' })).ok, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env['LOVABLE_API_KEY']; else process.env['LOVABLE_API_KEY'] = originalToken;
    if (originalConnection === undefined) delete process.env['UDC_MOZESMS_API_KEY']; else process.env['UDC_MOZESMS_API_KEY'] = originalConnection;
  }
});