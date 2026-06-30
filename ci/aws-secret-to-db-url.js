if (!process.env.DB_CONNECT_PARAMS_JSON) {
  console.error('Missing DB_CONNECT_PARAMS_JSON env var!');
  process.exit(1);
}

const {
  engine,
  username,
  password: rawPassword,
  host,
  port,
  dbname,
} = JSON.parse(process.env.DB_CONNECT_PARAMS_JSON);

if (!engine) {
  console.error('Missing engine in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

if (!username) {
  console.error('Missing username in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

if (!rawPassword) {
  console.error('Missing password in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

if (!host) {
  console.error('Missing host in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

if (!port) {
  console.error('Missing port in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

if (!dbname) {
  console.error('Missing dbname in DB_CONNECT_PARAMS_JSON!');
  process.exit(1);
}

const options = process.env.DB_OPTIONS ?? '';
const password = encodeURIComponent(rawPassword);
console.log(
  `${engine}://${username}:${password}@${host}:${port}/${dbname}?${options}`,
);
