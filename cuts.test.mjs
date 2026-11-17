import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeSheet } from './cuts.mjs';

const sample = {
  duration: '1:30.000',
  cuts: [
    {start: '0:02.350', end: '0:06.500', label: 'Opening'},
    {start: '1:01.500', end: '1:11.000', label: 'Guide <live>'},
  ],
};

test('Audacity labels use tab-separated seconds', () => {
  assert.equal(makeSheet(sample), '2.350\t6.500\tOpening\n61.500\t71.000\tGuide <live>\n');
});
test('chapter times cross the minute boundary', () => {
  assert.match(makeSheet(sample, 'chapters'), /00:01:01.500 --> 00:01:11.000\nGuide &lt;live&gt;/);
});
test('overlaps and clips past duration fail', () => {
  for (const [start, end] of [['0:03.000','0:04.000'],['1:12.000','1:31.000'],['1:15.000','1:14.000']]) {
    assert.throws(() => makeSheet({...sample, cuts:[sample.cuts[0],{start,end,label:'Invalid'}]}), /Cut 2/);
  }
});
test('bad timestamps and multi-line labels fail', () => {
  assert.throws(() => makeSheet({...sample, duration:'0:99.000'}), /timestamps/);
  assert.throws(() => makeSheet({...sample, cuts:[{...sample.cuts[0],label:'Bad\nrow'}]}), /single-line/);
});
