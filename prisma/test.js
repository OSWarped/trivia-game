import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const newGame = await prisma.game.create({
      data: {
        name: "tnt",
        date: new Date("2025-01-07"),
        hostingSiteId: "afbc87bb-3efe-4890-a39e-8fbd0fdf89f3",
        hostId: "3c1f78ff-34ca-4239-bd5f-2ecea2f1c55a",
      },
    });
    console.log(newGame);
    //console.log('Games:', games);
  } catch (error) {
    console.error('Error fetching games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
