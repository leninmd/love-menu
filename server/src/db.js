"use strict";

const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const { config } = require("./config");

function ensureDatabaseDirectory(dbPath) {
  const directory = path.dirname(dbPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

async function createDatabase() {
  ensureDatabaseDirectory(config.databasePath);
  const SQL = await initSqlJs();
  let sqlite;
  if (fs.existsSync(config.databasePath)) {
    const file = fs.readFileSync(config.databasePath);
    sqlite = new SQL.Database(file);
  } else {
    sqlite = new SQL.Database();
  }

  function persist() {
    const data = sqlite.export();
    fs.writeFileSync(config.databasePath, Buffer.from(data));
  }

  async function all(sql, params) {
    const statement = sqlite.prepare(sql);
    statement.bind(params || []);
    const rows = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
    statement.free();
    return rows;
  }

  async function get(sql, params) {
    const rows = await all(sql, params);
    return rows[0] || null;
  }

  async function run(sql, params) {
    const statement = sqlite.prepare(sql);
    statement.bind(params || []);
    statement.step();
    statement.free();
    persist();
    return { changes: sqlite.getRowsModified() };
  }

  return { sqlite, db: { all, get, run }, persist };
}

module.exports = { createDatabase };
