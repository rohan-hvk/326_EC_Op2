#!/usr/bin/env node
const fs = require('fs');

// A simple Stats class to track count, sum, min, max
class Stats {
  constructor() {
    this.count = 0;
    this.sum   = 0;
    this.min   = Infinity;
    this.max   = -Infinity;
  }
  add(x) {
    this.count++;
    this.sum += x;
    this.min = Math.min(this.min, x);
    this.max = Math.max(this.max, x);
  }
  average() {
    return this.count === 0 ? 0 : this.sum / this.count;
  }
}

// wrap the stream in a promise so we can await it
function processFile(path, columnName, stats) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let headerProcessed = false;
    let colIndex = -1;

    const stream = fs.createReadStream(path, { encoding: 'utf8' });
    stream.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep partial line

      for (let line of lines) {
        const cells = line.split(',').map(c => c.trim());
        if (!headerProcessed) {
          colIndex = cells.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
          if (colIndex < 0) {
            return reject(new Error(
              `Column "${columnName}" not found in headers: ${cells.join(', ')}`
            ));
          }
          headerProcessed = true;
        } else {
          const value = Number(cells[colIndex]);
          if (!isNaN(value)) stats.add(value);
        }
      }
    });

    stream.once('end', () => {
      if (buffer && headerProcessed) {
        const cells = buffer.split(',').map(c => c.trim());
        const value = Number(cells[colIndex]);
        if (!isNaN(value)) stats.add(value);
      }
      resolve();
    });

    stream.on('error', reject);
  });
}

async function main() {
  const [inputPath, columnName] = process.argv.slice(2);
  if (!inputPath || !columnName) {
    console.error('Usage: node csvStats.js <input.csv> <columnName>');
    process.exit(1);
  }

  const stats = new Stats();
  try {
    await processFile(inputPath, columnName, stats);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(2);
  }

  console.log('=== FINAL STATS ===');
  console.log(`Rows processed: ${stats.count}`);
  console.log(`Sum: ${stats.sum}`);
  console.log(`Min: ${stats.min}`);
  console.log(`Max: ${stats.max}`);
  console.log(`Average: ${stats.average().toFixed(2)}`);
}

main();
