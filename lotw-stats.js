#!/usr/bin/env node

import * as cheerio from 'cheerio';
import axios from 'axios';
import Database from 'better-sqlite3';

const db = new Database('./lotw.sqlite');

db.pragma('journal_mode = wal');

process.on('exit', () => db.close());

const migrations = [
  `CREATE TABLE IF NOT EXISTS status (
     timestamp PRIMARY KEY,
     outstanding_logs INTEGER,
     outstanding_qsos INTEGER,
     outstanding_bytes INTEGER,
     currently_processing TEXT
   )`
];

for (const statement of migrations) {
  db.prepare(statement).run();
}

function insert(row) {
  db.prepare(`INSERT INTO status
              (timestamp, outstanding_logs, outstanding_qsos, outstanding_bytes, currently_processing)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(timestamp) DO UPDATE SET
                outstanding_logs=excluded.outstanding_logs,
                outstanding_qsos=excluded.outstanding_qsos,
                outstanding_bytes=excluded.outstanding_bytes,
                currently_processing=excluded.currently_processing`).run(row);
}

// parse HTML from LoTW site
const response = await axios.get('https://www.arrl.org/logbook-queue-status');
const $ = cheerio.load(response.data);

const rows = $('#content table').find('tbody tr').map((_, tr) =>
  [$(tr).find('td').map((_, td) => $(td).text()).get()]
).get();

for (const row of rows) {
  insert(row);
}
