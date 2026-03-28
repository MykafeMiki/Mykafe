import { PrismaClient } from '@prisma/client';
// Usa porta 6543 (Supabase pooler)
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:HXziUAS39GTM7DFD@db.biefwzrprjqusjynqwus.supabase.co:6543/postgres' } }
});
try {
  const result = await prisma.$queryRaw`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`;
  console.log('Migrations applicate:');
  result.forEach(r => console.log(' -', r.version));
} catch(e) {
  console.error('Errore:', e.message);
} finally {
  await prisma.$disconnect();
}
