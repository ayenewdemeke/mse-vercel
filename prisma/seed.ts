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
      name: 'Abutment External Stability',
      key: 'abutment_external_stability',
      description: 'Check for external stability of an abutment.',
    },
    {
      name: 'Wing External Stability',
      key: 'wing_external_stability',
      description: 'Check for external stability of a wing (without LL).',
    },
    {
      name: 'Wing External Stability with LL',
      key: 'wing_external_stability_ll',
      description: 'Check for external stability of a wing (with LL).',
    },
    {
      name: 'Abutment Internal Stability',
      key: 'abutment_internal_stability',
      description: 'Check for internal stability of an abutment.',
    },
    {
      name: 'Wing Internal Stability',
      key: 'wing_internal_stability',
      description: 'Check for internal stability of a wing.',
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
