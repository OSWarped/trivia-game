import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    console.log(req);
    const games = await prisma.game.findMany({
      include: {
        teamGames: {
          include: {
            team: true, // Include details of the associated teams
          },
        },
        Site: true, // Include hosting site details
      },
    });

    // If no games found, return an empty array
    return NextResponse.json(games || []);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

// export async function POST(req: Request) {
//   const { siteId, seasonId, title } = await req.json();

//   /* ─── basic validation ─── */
//   if (!title || typeof title !== 'string') {
//     return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
//   }
//   if (!siteId || typeof siteId !== 'string') {
//     return NextResponse.json({ error: 'Invalid siteId' }, { status: 400 });
//   }
  

//   /* ─── get or create active season for the site ─── */
//   let seasonIdToUse = seasonId;

//   if (!seasonIdToUse) {
//     const activeSeason = await prisma.season.findFirst({
//       where: { siteId, isActive: true },
//     });

//     if (activeSeason) {
//       seasonIdToUse = activeSeason.id;
//     } else {
//       // auto‑create an open‑ended recurring season
//       const newSeason = await prisma.season.create({
//         data: {
//           siteId,
//           name: 'Ongoing Trivia',
//           recurring: true,
//         },
//       });
//       seasonIdToUse = newSeason.id;
//     }
//   }

//   try {
//     const newGame = await prisma.game.create({
//       data: {
//         siteId,
//         seasonId: seasonIdToUse,
//         title,
//         // status defaults to DRAFT; startedAt/endedAt null
//       },
//       include: {
//         site:   true,
//         season: true,
//       },
//     });

//     return NextResponse.json(newGame, { status: 201 });
//   } catch (err) {
//     console.error('Failed to create game:', err);
//     return NextResponse.json(
//       { error: 'Failed to create game' },
//       { status: 500 }
//     );
//   }
// }