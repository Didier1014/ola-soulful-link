import { describe, expect, it } from 'vitest';
import { zarRequestTotals } from './zar-requests';
describe('manual ZAR requests', () => {
  it('counts only LIVE paid sales, not pending or test payments', () => {
    expect(zarRequestTotals([{status:'paid',amount_minor:10000,fee_minor:800},{status:'test_paid',amount_minor:50000,fee_minor:4000},{status:'pending',amount_minor:20000,fee_minor:1600}],[]).sales).toBe(9200);
  });
  it('reserves pending and paid manual requests, releases rejected requests', () => {
    expect(zarRequestTotals([{status:'paid',amount_minor:10000,fee_minor:800}], [{status:'pending',amount_minor:2000},{status:'paid',amount_minor:3000},{status:'rejected',amount_minor:4000}]).requestable).toBe(4200);
  });
});