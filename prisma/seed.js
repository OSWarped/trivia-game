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
      hashedPw: hashedPassword,
      name: 'Blake Milam',
      role: 'HOST', // Assign both 'ADMIN' and 'HOST' roles to the user
    },
  });

  // 2) create the venue
const site = await prisma.site.create({
  data: {
    name:    'Murky Waters',
    address: '123 Government St',
  },
});

// 3) create a recurring event (Thursday 7 PM)
const event = await prisma.event.create({
  data: {
    name:   'Murky Waters Thursday Trivia',
    siteId: site.id,
    schedules: {
      create: {
        freq:   'WEEKLY',
        dow:    4,           // 0=Sun … 4=Thu
        timeUTC:'19:00',
      },
    },
  },
});

// 4) create an open‑ended season tied to that event
await prisma.season.create({
  data: {
    eventId:  event.id,
    name:     'Ongoing Trivia',
    recurring:true,
  },
});

  
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
