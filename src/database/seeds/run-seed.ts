import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { menuSeed } from './menu.seed';

const MENU_COLLECTION = 'menus';
const DISHES_COLLECTION = 'dishes';

async function runSeed() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri) {
    console.error('MONGODB_URI no esta definido en .env');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  const conn = await mongoose.connect(uri, dbName ? { dbName } : {});
  console.log('Conectado.');

  const db = conn.connection.db!;

  console.log('Limpiando colecciones...');
  await db.collection(DISHES_COLLECTION).deleteMany({});
  await db.collection(MENU_COLLECTION).deleteMany({});
  console.log('Colecciones limpiadas.');

  for (const seedMenu of menuSeed) {
    const { platos, ...menuData } = seedMenu;

    // Insert menu document
    const menuResult = await db
      .collection(MENU_COLLECTION)
      .insertOne({ ...menuData, createdAt: new Date(), updatedAt: new Date() });

    console.log(`Menu insertado: ${seedMenu.fecha} (${menuResult.insertedId})`);

    // Insert dishes linked to the menu
    if (platos.length > 0) {
      const dishDocs = platos.map((plato) => ({
        ...plato,
        menuId: menuResult.insertedId,
        es_hipo: plato.es_hipo ?? false,
        opciones: plato.opciones ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.collection(DISHES_COLLECTION).insertMany(dishDocs);
      console.log(`  ${dishDocs.length} platos insertados.`);
    }
  }

  console.log('\nSeed completado exitosamente.');
  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
