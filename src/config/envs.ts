import 'dotenv/config';
import * as joi from 'joi';

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;

  PRODUCTS_MICROSERVICES_PORT: number;
  PRODUCTS_MICROSERVICES_HOST: string;
}

const envVarsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const { error, value } = envVarsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS.split(','),
});

if (error) {
  throw new Error(`Error en el archivo de configuacion .env: ${error.message}`);
}

const envVars: EnvConfig = value;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,

  productsPort: envVars.PRODUCTS_MICROSERVICES_PORT,
  productsHost: envVars.PRODUCTS_MICROSERVICES_HOST,
};