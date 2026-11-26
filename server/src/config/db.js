import { Sequelize } from 'sequelize';

const sslConfig = process.env.DB_SSL_REQUIRED === 'true'
  ? {
    require: true,
    // Default to false when no CA cert is provided (Aiven uses self-signed cert)
    // Set DB_SSL_REJECT_UNAUTHORIZED=true and DB_CA_CERT for production with verified cert
    rejectUnauthorized:
      process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' &&
      !!process.env.DB_CA_CERT,
    ...(process.env.DB_CA_CERT && { ca: process.env.DB_CA_CERT }),
  }
  : {};

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  ...(Object.keys(sslConfig).length > 0 && { dialectOptions: { ssl: sslConfig } }),
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('PostgreSQL Connected');
  } catch (error) {
    console.error('PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
export { sequelize };
