#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const url = process.env.BENCHMARK_URL ?? 'http://localhost:3000/health';
const concurrency = Number(process.env.BENCHMARK_CONCURRENCY ?? 100);
const durationMs = Number(process.env.BENCHMARK_DURATION_MS ?? 15000);
const timeoutMs = Number(process.env.BENCHMARK_TIMEOUT_MS ?? 5000);
const maxSamples = Number(process.env.BENCHMARK_MAX_SAMPLES ?? 20000);

if (!Number.isFinite(concurrency) || concurrency <= 0) {
  throw new Error('BENCHMARK_CONCURRENCY must be > 0');
}

const deadline = Date.now() + durationMs;
const latencies = [];
let total = 0;
let failed = 0;

async function worker() {
  while (Date.now() < deadline) {
    const start = performance.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        failed += 1;
      }
    } catch {
      failed += 1;
    } finally {
      clearTimeout(timeout);
    }

    const latency = performance.now() - start;
    total += 1;

    if (latencies.length < maxSamples) {
      latencies.push(latency);
    }
  }
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor(sortedValues.length * p) - 1),
  );

  return sortedValues[index];
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSeconds = (performance.now() - startedAt) / 1000;

latencies.sort((a, b) => a - b);
const rps = total / Math.max(elapsedSeconds, 0.001);

const report = {
  url,
  concurrency,
  durationMs,
  totalRequests: total,
  failedRequests: failed,
  successRate: total === 0 ? 0 : ((total - failed) / total) * 100,
  rps,
  latencyMs: {
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
