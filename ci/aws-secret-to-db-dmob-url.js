const connectParamsEnvVar = 'DB_DMOB_CONNECT_PARAMS_JSON';

if (!process.env[connectParamsEnvVar]) {
  console.error(`Missing ${connectParamsEnvVar} env var!`);
  process.exit(1);
}

const connectParams = JSON.parse(process.env[connectParamsEnvVar]);

const {
  DB_HOST: host,
  DB_PORT: port,
  DB_USERNAME: username,
  DB_PASSWORD: rawPassword,
  DB_DATABASE_NAME: dbname,
} = connectParams;

const engine = 'postgres';

if (!username) {
  console.error(`Missing DB_USERNAME in ${connectParamsEnvVar}!`);
  process.exit(1);
}

if (!rawPassword) {
  console.error(`Missing DB_PASSWORD in ${connectParamsEnvVar}!`);
  process.exit(1);
}

if (!host) {
  console.error(`Missing DB_HOST in ${connectParamsEnvVar}!`);
  process.exit(1);
}

if (!port) {
  console.error(`Missing DB_PORT in ${connectParamsEnvVar}!`);
  process.exit(1);
}

if (!dbname) {
  console.error(`Missing DB_DATABASE_NAME in ${connectParamsEnvVar}!`);
  process.exit(1);
}

const options = process.env.DB_DMOB_OPTIONS ?? '';
const password = encodeURIComponent(rawPassword);
console.log(
  `${engine}://${username}:${password}@${host}:${port}/${dbname}?${options}`,
);
