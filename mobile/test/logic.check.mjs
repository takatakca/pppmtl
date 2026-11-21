// Pure ordering rules of the app, run with Node's own test runner (type stripping, no build step).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkoutTotals, defaultSelections, deliversTo, deliveryAddressLine, formatTime, groupMax, groupMin, isOpenAt,
  missingGroups, money, postalCodeOf, searchItems, statusStep, toggleChoice, unitCents, validEmail, validPhone, randomHex,
} from '../src/lib/logic.ts';

const size = { id: 'size', labelEn: 'Size', labelFr: 'Format', required: true, min: 1, max: 1, choices: [
  { id: 's', labelEn: 'Small', labelFr: 'Petite', priceDelta: null },
  { id: 'l', labelEn: 'Large', labelFr: 'Grande', priceDelta: 4 },
] };
const extras = { id: 'x', labelEn: 'Extras', labelFr: 'Extras', required: false, min: 0, max: 2, choices: [
  { id: 'a', labelEn: 'Bacon', labelFr: 'Bacon', priceDelta: 1.5 },
  { id: 'b', labelEn: 'Cheese', labelFr: 'Fromage', priceDelta: 1 },
  { id: 'c', labelEn: 'Onion', labelFr: 'Oignon', priceDelta: 0.5 },
] };

test('option rules', () => {
  assert.equal(groupMin(size), 1);
  assert.equal(groupMax(extras), 2);
  let sel = defaultSelections([size, extras]);
  assert.equal(missingGroups([size, extras], sel).length, 1); // two sizes: the customer must choose
  sel = toggleChoice({}, size, 'l');
  assert.deepEqual(missingGroups([size, extras], sel), []);
  sel = toggleChoice(sel, extras, 'a');
  sel = toggleChoice(sel, extras, 'b');
  const three = toggleChoice(sel, extras, 'c');
  assert.ok(Object.values(three).join(',').split(',').filter((v) => ['a', 'b', 'c'].includes(v)).length <= 2, 'max 2 extras');
  assert.equal(unitCents({ price: 12.99, modifierGroups: [size, extras] }, sel), 1299 + 400 + 150 + 100);
  assert.equal(unitCents({ price: null, modifierGroups: [] }, {}), null);
});

test('money, taxes and totals (Québec)', () => {
  assert.equal(money(1499, 'fr'), '14,99 $');
  assert.equal(money(1499, 'en'), '$14.99');
  assert.equal(money(null, 'fr'), '');
  const t = checkoutTotals({ subtotal: 2000, deliveryFee: 500, tip: 300 });
  assert.equal(t.taxes, 125 + 249); // TPS 5 % + TVQ 9,975 % on food and delivery, not on the tip
  assert.equal(t.total, 2000 + 500 + 374 + 300);
});

test('delivery area and address', () => {
  assert.equal(postalCodeOf('5765 rue Sherbrooke O, h4a1x2'), 'H4A 1X2');
  assert.equal(postalCodeOf('nothing'), null);
  assert.ok(deliversTo('H4A 1X2', ['H4A', 'H4B']));
  assert.ok(!deliversTo('H1A 1A1', ['H4A']));
  assert.ok(!deliversTo(null, ['H4A']));
  assert.equal(deliveryAddressLine({ street: '5765 Sherbrooke O', unit: '3', postalCode: 'h4a1x2', instructions: 'Sonner' }), '5765 Sherbrooke O, App. 3, Montréal, QC H4A 1X2 — Sonner');
});

test('contact checks', () => {
  assert.ok(validPhone('(514) 555-1234'));
  assert.ok(validPhone('1 514 555 1234'));
  assert.ok(!validPhone('555-1234'));
  assert.ok(validEmail('client@exemple.ca'));
  assert.ok(!validEmail('client@exemple'));
});

test('hours, after midnight too', () => {
  assert.equal(isOpenAt({ opens: '11:00', closes: '23:00' }, 12 * 60), true);
  assert.equal(isOpenAt({ opens: '11:00', closes: '23:00' }, 23 * 60 + 30), false);
  assert.equal(isOpenAt({ opens: '11:00', closes: '03:00' }, 60), true);
  assert.equal(isOpenAt(null, 60), null);
  assert.equal(formatTime('23:00', 'fr'), '23 h');
  assert.equal(formatTime('11:30', 'en'), '11:30 a.m.');
});

test('search ignores accents and needs every word', () => {
  const items = [
    { id: '1', name: { fr: 'Poutine régulière', en: 'Regular poutine' }, search: 'frites fromage sauce', badges: [] },
    { id: '2', name: { fr: 'Pizza toute garnie', en: 'All dressed pizza' }, search: 'pepperoni champignons', badges: ['popular'] },
  ];
  assert.deepEqual(searchItems(items, 'reguliere').map((i) => i.id), ['1']);
  assert.deepEqual(searchItems(items, 'pizza pepperoni').map((i) => i.id), ['2']);
  assert.deepEqual(searchItems(items, 'x'), []);
});

test('order timeline', () => {
  assert.equal(statusStep('CREATED'), 0);
  assert.equal(statusStep('PREPARING'), 2);
  assert.equal(statusStep('COMPLETED'), 4);
  assert.equal(statusStep('CANCELLED'), -1);
  assert.equal(randomHex(new Uint8Array([0, 255, 16])), '00ff10');
});
