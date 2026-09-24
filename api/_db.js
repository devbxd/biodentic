const { neon } = require('@neondatabase/serverless');

let sqlClient = null;
function sql() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

module.exports = { sql };
