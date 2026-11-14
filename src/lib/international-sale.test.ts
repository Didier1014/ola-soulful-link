import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { internationalSaleNotice } from './international-sale';
for (const currency of ['ZAR', 'USD', 'EUR']) {
  test(`international notifications preserve ${currency} without conversion`, () => {
    const notice = internationalSaleNotice({ currency, amount_minor: 59900 }, 'Bundle');
    assert.equal(notice.title, `Sale confirmed · ${currency}`);
    assert.equal(notice.amount, new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(599));
  });
}