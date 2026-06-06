import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // ── Member Roles ──────────────────────────────────────────────────────────
  const roles = ['Designer', 'Supervisor', 'Manager', 'Other'];
  for (const name of roles) {
    await db.memberRole.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${roles.length} member roles`);

  // ── Design Types ─────────────────────────────────────────────────────────
  const designTypes = [
    {
      name: 'Abutment',
      key: 'abutment',
      description: 'MSE abutment wall — runs external and internal stability checks.',
    },
    {
      name: 'Wing',
      key: 'wing',
      description: 'MSE wing wall — runs external (with LL, without LL) and internal stability checks.',
    },
    {
      name: 'Precast Panel Face',
      key: 'panel_face',
      description: 'Flexure, shear, and crack control check for precast panel face.',
    },
  ];

  for (const dt of designTypes) {
    await db.designType.upsert({
      where: { key: dt.key },
      update: { name: dt.name, description: dt.description },
      create: dt,
    });
  }
  console.log(`Seeded ${designTypes.length} design types`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
