import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import { createApp } from './app.js';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function start() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dewglen-'));
  const { app } = createApp({ dataDir });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

function cookieFrom(response) {
  return (response.headers.getSetCookie?.() || []).map((item) => item.split(';')[0]).join('; ');
}

test('residents and the mayor can write, view, and moderate a journal', async () => {
  const ctx = await start();
  try {
    const health = await fetch(`${ctx.base}/api/health`);
    assert.equal((await health.json()).ok, true);

    const guest = await fetch(`${ctx.base}/api/entries`);
    const seeded = await guest.json();
    assert.ok(seeded.entries.length >= 4);
    assert.ok(seeded.entries.some((entry) => entry.media.some((item) => item.kind === 'video')));

    const registered = await fetch(`${ctx.base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mint', displayName: '민트', password: 'garden-1' }),
    });
    assert.equal(registered.status, 201);
    const residentCookie = cookieFrom(registered);

    const denied = await fetch(`${ctx.base}/api/admin/overview`, {
      headers: { cookie: residentCookie },
    });
    assert.equal(denied.status, 403);

    const form = new FormData();
    form.set('title', '민트의 새싹');
    form.set('body', '창가 화분에 물을 주었습니다.');
    form.set('category', '작물');
    form.set('season', '봄');
    form.append('files', new Blob([png], { type: 'image/png' }), 'sprout.png');
    const created = await fetch(`${ctx.base}/api/entries`, {
      method: 'POST',
      headers: { cookie: residentCookie },
      body: form,
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    assert.equal(createdBody.entry.media.length, 1);
    assert.equal(createdBody.entry.media[0].kind, 'image');

    const media = await fetch(`${ctx.base}${createdBody.entry.media[0].url}`);
    assert.equal(media.status, 200);
    assert.match(media.headers.get('content-type') || '', /image/);

    const other = await fetch(`${ctx.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sprout', password: 'dew-drop' }),
    });
    const sproutCookie = cookieFrom(other);
    const forbidden = await fetch(`${ctx.base}/api/entries/${createdBody.entry.id}`, {
      method: 'DELETE',
      headers: { cookie: sproutCookie },
    });
    assert.equal(forbidden.status, 403);

    const mayor = await fetch(`${ctx.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mayor', password: 'orchard-gate' }),
    });
    const mayorCookie = cookieFrom(mayor);
    const promoted = await fetch(`${ctx.base}/api/admin/users/${createdBody.entry.author.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: mayorCookie },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(promoted.status, 200);

    const removed = await fetch(`${ctx.base}/api/entries/${createdBody.entry.id}`, {
      method: 'DELETE',
      headers: { cookie: mayorCookie },
    });
    assert.equal(removed.status, 200);
    const gone = await fetch(`${ctx.base}/api/entries/${createdBody.entry.id}`);
    assert.equal(gone.status, 404);
  } finally {
    await ctx.close();
  }
});
