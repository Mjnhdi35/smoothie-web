#!/usr/bin/env node
import { monitorEventLoopDelay } from 'node:perf_hooks';

const durationMs = Number(process.env.EVENT_LOOP_SAMPLE_MS ?? 30000);
const resolution = Number(process.env.EVENT_LOOP_RESOLUTION_MS ?? 20);

const histogram = monitorEventLoopDelay({ resolution });
histogram.enable();

await new Promise((resolve) => setTimeout(resolve, durationMs));
histogram.disable();

const report = {
  durationMs,
  resolutionMs: resolution,
  minMs: histogram.min / 1e6,
  maxMs: histogram.max / 1e6,
  meanMs: histogram.mean / 1e6,
  stddevMs: histogram.stddev / 1e6,
  p50Ms: histogram.percentile(50) / 1e6,
  p95Ms: histogram.percentile(95) / 1e6,
  p99Ms: histogram.percentile(99) / 1e6,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
