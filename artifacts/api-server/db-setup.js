import pg from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/eval_portal';
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();

    console.log('Connected to DB. Creating tables...');

    await client.query("CREATE TYPE IF NOT EXISTS role AS ENUM ('guide', 'student');");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        username text NOT NULL UNIQUE,
        password text NOT NULL,
        name text NOT NULL,
        role role NOT NULL,
        department text NOT NULL,
        roll_number text,
        batch_id integer,
        is_form_added boolean NOT NULL DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id serial PRIMARY KEY,
        name text NOT NULL,
        project_title text NOT NULL,
        project_description text NOT NULL,
        academic_year text NOT NULL DEFAULT '2024-25',
        guide_id integer NOT NULL,
        is_csv_added boolean NOT NULL DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id serial PRIMARY KEY,
        batch_id integer NOT NULL,
        student_id integer NOT NULL,
        evaluator_id integer NOT NULL,
        evaluator_type text NOT NULL,
        marks real NOT NULL
      );
    `);

    console.log('Tables created. Inserting guide1 if not exists...');

    const result = await client.query('SELECT id FROM users WHERE username = $1', ['guide1']);
    if (result.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, password, name, role, department, is_form_added) VALUES ($1,$2,$3,$4,$5,$6)`,
        ['guide1', 'password123', 'Dr. Priya Sharma', 'guide', 'Computer Science', false],
      );
      console.log('Inserted guide1 successfully.')
    } else {
      console.log('guide1 already exists.');
    }

    console.log('DB setup complete.');
  } catch (error) {
    console.error('DB setup failed', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
