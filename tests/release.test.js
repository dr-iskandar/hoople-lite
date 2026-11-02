import test from 'node:test';
import assert from 'node:assert/strict';
import {toReleaseInstant,releaseLocalValue,isReleaseScheduled,displayExperienceStatus,releaseCountdown} from '../src/release.js';

test('WIB Sunday 09:00 maps to 02:00 UTC',()=>{
  assert.equal(toReleaseInstant('2026-11-01T09:00','Asia/Jakarta'),'2026-11-01T02:00:00.000Z');
});

test('WITA and WIT preserve wall-clock time',()=>{
  assert.equal(toReleaseInstant('2026-11-01T09:00','Asia/Makassar'),'2026-11-01T01:00:00.000Z');
  assert.equal(toReleaseInstant('2026-11-01T09:00','Asia/Jayapura'),'2026-11-01T00:00:00.000Z');
});

test('invalid dates and local time are rejected',()=>{
  assert.equal(toReleaseInstant('2026-02-30T09:00','Asia/Jakarta'),'');
  assert.equal(toReleaseInstant('01/11/2026 09:00','Asia/Jakarta'),'');
  assert.equal(toReleaseInstant('2026-11-01T25:00','Asia/Jakarta'),'');
});

test('format conversion roundtrips',()=>{
  assert.equal(releaseLocalValue('2026-11-01T02:00:00.000Z','Asia/Jakarta'),'2026-11-01T09:00');
});

test('scheduled status is time-dependent; draft stays draft',()=>{
  const e={status:'published',publication:{mode:'scheduled',startsAt:'2026-11-01T02:00:00.000Z'}};
  const before=Date.parse('2026-11-01T01:59:59.000Z');
  const after=Date.parse('2026-11-01T02:00:00.000Z');
  assert.equal(isReleaseScheduled(e,before),true);
  assert.equal(isReleaseScheduled(e,after),false);
  assert.equal(displayExperienceStatus(e,before),'scheduled');
  assert.equal(displayExperienceStatus(e,after),'published');
  assert.equal(displayExperienceStatus({...e,status:'draft'},before),'draft');
});

test('countdown never becomes negative',()=>{
  const at=Date.parse('2026-11-01T02:00:00.000Z');
  assert.deepEqual(releaseCountdown('2026-11-01T02:00:00.000Z',at+10000),{days:0,hours:0,minutes:0});
  assert.equal(releaseCountdown('invalid',at),null);
});
