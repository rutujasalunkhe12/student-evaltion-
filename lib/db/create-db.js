import Database from 'better-sqlite3';

const db = new Database('eval_portal.db');

db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  roll_number TEXT,
  batch_id INTEGER,
  is_form_added INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  guide_id INTEGER NOT NULL,
  is_csv_added INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  evaluator_id INTEGER NOT NULL,
  evaluator_type TEXT NOT NULL,
  marks REAL NOT NULL
);
`);

const insertGuide = db.prepare('INSERT INTO users (username, password, name, role, department) VALUES (?, ?, ?, ?, ?)');
insertGuide.run('guide1', 'password', 'Guide One', 'guide', 'Computer Science');

db.close();

console.log('Database created and seeded with guide1 user.');