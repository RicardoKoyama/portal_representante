const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.SQLITE_DB_PATH;

const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco SQLite:', err.message);
    } else {
      console.log('✅ Conectado ao banco SQLite:', dbPath);
    }
  }
);

module.exports = db;
