const {Pool} = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hoteli',
    password: '16028400',
    port: 5432  // zasto 5432
});

module.exports = pool;