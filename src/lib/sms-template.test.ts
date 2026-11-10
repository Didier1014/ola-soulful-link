import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canEditPaymentSms, selectPaymentSmsTemplate, buildFixedSmsTemplate, FIXED_SMS_TEMPLATE } from "./sms-template";

test("premium users can customize post-payment SMS", () => {
  assert.equal(canEditPaymentSms(["user", "premium"]), true);
  assert.equal(selectPaymentSmsTemplate("Obrigado {nome}!", ["premium"]), "Obrigado {nome}!");
});
test("administrators can customize post-payment SMS", () => {
  assert.equal(canEditPaymentSms(["admin"]), true);
  assert.equal(selectPaymentSmsTemplate("Pagamento {valor}", ["admin"]), "Pagamento {valor}");
});
test("ordinary or revoked users cannot use a custom payment SMS", () => {
  assert.equal(canEditPaymentSms(["user"]), false);
  assert.equal(selectPaymentSmsTemplate("Texto adulterado", ["user"]), FIXED_SMS_TEMPLATE);
  assert.equal(selectPaymentSmsTemplate("Texto adulterado", []), FIXED_SMS_TEMPLATE);
});
test("empty custom SMS falls back to the standard message", () => {
  assert.equal(selectPaymentSmsTemplate("  ", ["premium"]), FIXED_SMS_TEMPLATE);
});
test("custom payment SMS resolves transaction and both seller support numbers", () => {
  assert.equal(buildFixedSmsTemplate({ nome: "Ana", produto: "Curso", valor: "300 MT", link: "https://example.com/curso", suporte1: "841111111", suporte2: "852222222", suporte3: "863333333" }, "{nome}: {produto}, {valor}. {link}. {suporte1}/{suporte2} ({suporte3})"),
    "Ana: Curso, 300 MT. https://example.com/curso. 841111111/852222222 (863333333)");
});