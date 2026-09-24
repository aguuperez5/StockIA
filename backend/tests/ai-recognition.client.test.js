import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRecognitionError, analyzeProductImage } from '../services/ai-recognition.client.js';

function saveEnv() {
  return {
    url: process.env.AI_SERVICE_URL,
    token: process.env.AI_SERVICE_TOKEN,
    fetch: globalThis.fetch,
  };
}

function restoreEnv(saved) {
  if (saved.url === undefined) delete process.env.AI_SERVICE_URL;
  else process.env.AI_SERVICE_URL = saved.url;
  if (saved.token === undefined) delete process.env.AI_SERVICE_TOKEN;
  else process.env.AI_SERVICE_TOKEN = saved.token;
  globalThis.fetch = saved.fetch;
}

test('forwards a bounded photo as multipart to the configured local AI service', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010/';
  process.env.AI_SERVICE_TOKEN = 'local-test-token';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ identifiers: [], text_evidence: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await analyzeProductImage({
      photoData: 'data:image/jpeg;base64,aGVsbG8=',
      photoMimeType: 'image/jpeg',
    });
    assert.equal(result.identifiers.length, 0);
    assert.equal(request.url, 'http://127.0.0.1:8010/v1/analyze');
    assert.equal(request.options.headers.Authorization, 'Bearer local-test-token');
    assert.equal(request.options.body.get('image').type, 'image/jpeg');
    assert.equal(request.options.body.get('image').size, 5);
  } finally {
    restoreEnv(saved);
  }
});

test('does not pretend to recognize a photo when the service is not configured', async () => {
  const saved = saveEnv();
  delete process.env.AI_SERVICE_URL;
  try {
    await assert.rejects(
      analyzeProductImage({ photoData: 'data:image/jpeg;base64,aGVsbG8=', photoMimeType: 'image/jpeg' }),
      error => error instanceof AIRecognitionError && error.statusCode === 503,
    );
  } finally {
    restoreEnv(saved);
  }
});

test('rejects invalid image MIME types before making a network request', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('must not call');
  };
  try {
    await assert.rejects(
      analyzeProductImage({ photoData: 'data:image/gif;base64,aGVsbG8=', photoMimeType: 'image/gif' }),
      error => error instanceof AIRecognitionError && error.statusCode === 400,
    );
    assert.equal(called, false);
  } finally {
    restoreEnv(saved);
  }
});
