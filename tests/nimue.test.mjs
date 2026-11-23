import { test } from 'node:test';
import assert from 'node:assert/strict';

export const students = Object.freeze([
  ['S01','fractions',45], ['S02','reading',55], ['S03','geometry',76],
  ['S04','writing',42], ['S05','science',85], ['S06','arithmetic',60]
].map(([id,topic,score]) => Object.freeze({id,topic,score,guardians:[`${id}-G1`,`${id}-G2`]})));

export const suggestedReview = student => student.score < 70
  ? {studentId:student.id,topic:student.topic,status:'teacher-review',meetingMinutes:15}
  : null;

test('six fictional profiles and targeted teacher review', () => {
  assert.equal(students.length,6);
  assert.equal(students.flatMap(s=>s.guardians).length,12);
  assert.equal(students.filter(s=>suggestedReview(s)).length,4);
  assert.equal(suggestedReview(students[0]).topic,'fractions');
});
