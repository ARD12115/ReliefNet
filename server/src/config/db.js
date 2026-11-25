import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL Connected');
  } catch (error) {
    console.error('PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
export { sequelize };
