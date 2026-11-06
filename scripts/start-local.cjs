// Entorno de demostración aislado: nunca conecta a la URI del .env ni envía WhatsApp.
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { getModelToken } = require('@nestjs/mongoose');

let app;
let mongo;
async function stop() {
  if (app) await app.close();
  if (mongo) await mongo.stop();
}
async function main() {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri(),
    MONGODB_DB_NAME: 'delivery_lunch_demo',
    JWT_SECRET: require('node:crypto').randomBytes(32).toString('hex'),
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: await bcrypt.hash('admin', 12),
    KITCHEN_USERNAME: 'cocina',
    KITCHEN_PASSWORD_HASH: await bcrypt.hash('cocina', 12),
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: 'demo',
    CLOUDINARY_API_SECRET: 'demo',
    WHATSAPP_NOTIFY_PHONE: '',
    CALLMEBOT_API_KEY: '',
  });
  const { AppModule } = require('../dist/app.module');
  app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const date = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Santiago',
  });
  const { menuSeed } = require('../dist/database/seeds/menu.seed');
  const { platos, ...menuData } = menuSeed[0];
  const menu = await app.get(getModelToken('Menu')).create({ ...menuData, fecha: date });
  await app.get(getModelToken('Dish')).create(platos.map(dish => ({ ...dish, menuId: menu._id })));
  await app.listen(Number(process.env.PORT || 3500), '127.0.0.1');
  console.log(
    'Backend de demostración en http://localhost:' + (process.env.PORT || 3500),
  );
  console.log(
    'MongoDB temporal local; WhatsApp desactivado. Los datos se eliminan al detener el proceso.',
  );
  console.log(
    'Personal: admin/admin y cocina/cocina. Para pedidos se exige Google real.',
  );
}
process.once('SIGINT', () => {
  void stop().then(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void stop().then(() => process.exit(0));
});
main().catch(async (error) => {
  console.error(error.message);
  await stop();
  process.exitCode = 1;
});
