const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('adminpassword', 10);

  // Create or update a hosting site
  // const hostingSite = await prisma.hostingSite.upsert({
  //   where: { name: 'Buffalo Wild Wings - D\'Iberville - Tuesdays' }, // Use the unique name field
  //   update: {},
  //   create: {
  //     name: 'Buffalo Wild Wings - D\'Iberville - Tuesdays',
  //     location: 'D\'Iberville, MS',
  //   },
  // });

  //Create the admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'blakemilam@gmail.com' },
    update: {},
    create: {
      email: 'blakemilam@gmail.com',
      password: hashedPassword,
      name: 'Blake Milam',
      roles: ['ADMIN', 'HOST'], // Assign both 'ADMIN' and 'HOST' roles to the user
    },
  });

  // const hostingSite = await prisma.hostingSite.create({
  //   data: {
  //     name: "Buffalo Wild Wings - D'Iberville",
  //     location: "D'Iberville, MS",
  //   },
  // });

  // // Create sample games and associate them with the hosting site
  // const game1 = await prisma.game.create({
  //   data: {
  //     date: new Date("2025-01-01T10:00:00.000Z"),
  //     hostingSiteId: hostingSite.id,  // Connect the game to the hosting site
  //   },
  // });

  // const game2 = await prisma.game.create({
  //   data: {
  //     date: new Date("2025-02-01T14:00:00.000Z"),
  //     hostingSiteId: hostingSite.id,  // Connect the game to the hosting site
  //   },
  // });

  // // Create teams for each game
  // await prisma.team.create({
  //   data: {
  //     name: "Team A",
  //     gameId: game1.id, // Associating with game1
  //   },
  // });

  // await prisma.team.create({
  //   data: {
  //     name: "Team B",
  //     gameId: game2.id, // Associating with game2
  //   },
  // });

  console.log('Seeding complete');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
