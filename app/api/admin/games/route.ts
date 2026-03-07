import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type GameListItem = {
  id: string;
  title: string;
  joinCode: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  special: boolean;
  tag: string | null;
  season: {
    id: string;
    name: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type EventGroup = {
  eventId: string;
  eventName: string;
  upcomingGames: GameListItem[];
  pastGames: GameListItem[];
};

type SiteGroup = {
  siteId: string;
  siteName: string;
  events: EventGroup[];
};

function toGameListItem(game: {
  id: string;
  title: string;
  joinCode: string;
  status: string;
  scheduledFor: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  special: boolean;
  tag: string | null;
  season: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
      site: {
        id: string;
        name: string;
      };
    };
  };
  host: {
    id: string;
    name: string;
    email: string;
  } | null;
}): GameListItem {
  return {
    id: game.id,
    title: game.title,
    joinCode: game.joinCode,
    status: game.status,
    scheduledFor: game.scheduledFor ? game.scheduledFor.toISOString() : null,
    startedAt: game.startedAt ? game.startedAt.toISOString() : null,
    endedAt: game.endedAt ? game.endedAt.toISOString() : null,
    special: game.special,
    tag: game.tag,
    season: {
      id: game.season.id,
      name: game.season.name,
    },
    host: game.host
      ? {
          id: game.host.id,
          name: game.host.name,
          email: game.host.email,
        }
      : null,
  };
}

function isUpcoming(game: {
  status: string;
  scheduledFor: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
}, now: Date): boolean {
  if (game.status === 'CLOSED' || game.status === 'CANCELED') {
    return false;
  }

  if (game.endedAt) {
    return false;
  }

  if (game.startedAt && game.status === 'LIVE') {
    return true;
  }

  if (!game.scheduledFor) {
    return game.status === 'DRAFT' || game.status === 'SCHEDULED';
  }

  return game.scheduledFor >= now;
}

export async function GET() {
  try {
    const now = new Date();

    const games = await prisma.game.findMany({
      include: {
        season: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                name: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          season: {
            event: {
              site: {
                name: 'asc',
              },
            },
          },
        },
        {
          season: {
            event: {
              name: 'asc',
            },
          },
        },
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const siteMap = new Map<string, SiteGroup>();

    for (const game of games) {
      const site = game.season.event.site;
      const event = game.season.event;

      let siteGroup = siteMap.get(site.id);
      if (!siteGroup) {
        siteGroup = {
          siteId: site.id,
          siteName: site.name,
          events: [],
        };
        siteMap.set(site.id, siteGroup);
      }

      let eventGroup = siteGroup.events.find((e) => e.eventId === event.id);
      if (!eventGroup) {
        eventGroup = {
          eventId: event.id,
          eventName: event.name,
          upcomingGames: [],
          pastGames: [],
        };
        siteGroup.events.push(eventGroup);
      }

      const item = toGameListItem(game);

      if (isUpcoming(game, now)) {
        eventGroup.upcomingGames.push(item);
      } else {
        eventGroup.pastGames.push(item);
      }
    }

    const payload: SiteGroup[] = Array.from(siteMap.values()).map((siteGroup) => ({
      ...siteGroup,
      events: siteGroup.events.map((eventGroup) => ({
        ...eventGroup,
        upcomingGames: eventGroup.upcomingGames.sort((a, b) => {
          const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }),
        pastGames: eventGroup.pastGames.sort((a, b) => {
          const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
          const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
          return bTime - aTime;
        }),
      })),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error(
      'Error fetching admin game list:',
      error instanceof Error ? error.message : String(error),
    );

    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 },
    );
  }
}