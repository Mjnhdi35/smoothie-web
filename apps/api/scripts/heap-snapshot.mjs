#!/usr/bin/env node
import { writeHeapSnapshot } from 'node:v8';

const output = process.env.HEAP_SNAPSHOT_PATH;
const filePath = writeHeapSnapshot(output);

process.stdout.write(
  `${JSON.stringify({ event: 'heap_snapshot_written', filePath })}\n`,
);
