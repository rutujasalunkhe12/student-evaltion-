import { config } from "dotenv";
config({ path: "../../.env" });
import pg from "pg";

const { Client } = pg;

// Connect to postgres database to create eval_portal
const client = new Client({ connectionString: "postgresql://postgres:password@localhost:5432/postgres" });

client.connect(async (err) => {
  if (err) {
    console.error('Connection error to postgres db', err);
    return;
  }
  console.log('Connected to postgres db');
  try {
    await client.query('CREATE DATABASE eval_portal');
    console.log('Database eval_portal created');
  } catch (e) {
    if (e.code === '42P04') {
      console.log('Database eval_portal already exists');
    } else {
      console.error('Error creating database', e);
    }
  }
  client.end();

  // Now test connection to eval_portal
  const client2 = new Client({ connectionString: process.env.DATABASE_URL });
  client2.connect((err2) => {
    if (err2) {
      console.error('Connection error to eval_portal', err2);
    } else {
      console.log('Connected to eval_portal');
      client2.end();
    }
  });
});