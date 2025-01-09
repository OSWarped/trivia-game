const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // Fetch all existing teams and their memberships
  const teams = await prisma.team.findMany({
    include: {
      memberships: {
        include: {
          user: true, // Include user details from TeamMembership
        },
      },
      game: true, // Include associated game
    },
  });

  for (const team of teams) {
    for (const membership of team.memberships) {
      const user = membership.user;

      // Ensure the user isn't already in the `TeamMembership` table for the same game
      const existingMembership = await prisma.teamMembership.findFirst({
        where: {
          userId: user.id,
          gameId: team.gameId,
        },
      });

      if (!existingMembership) {
        // Create a new TeamMembership entry
        await prisma.teamMembership.create({
          data: {
            userId: user.id,
            teamId: team.id,
            gameId: team.gameId,
          },
        });
        console.log(`Created membership for user ${user.id} in team ${team.id}`);
      }
    }
  }

  console.log('Data migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
