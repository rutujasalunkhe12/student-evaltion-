import pg from 'pg';

const { Client } = pg;

async function insertGuideUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Check if guide1 already exists
    const res = await client.query('SELECT * FROM users WHERE username = $1', ['guide1']);
    if (res.rows.length > 0) {
      console.log("Guide user already exists!");
      return;
    }

    await client.query(`
      INSERT INTO users (username, password, name, role, department, is_form_added)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['guide1', 'password123', 'Dr. Priya Sharma', 'guide', 'Computer Science', false]);

    console.log("Guide user inserted successfully!");
  } catch (error) {
    console.error("Error inserting guide user:", error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

insertGuideUser();