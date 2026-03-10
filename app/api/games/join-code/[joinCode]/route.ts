// File: /app/api/games/join-code/[joinCode]/route.ts
import { NextResponse } from 'next/server';
import {
  PrismaClient,
  TeamGameSessionControlMode,
} from '@prisma/client';

const prisma = new PrismaClient();

type SuggestionSource = 'CURRENT_GAME' | 'KNOWN_SITE';

interface JoinTeamSuggestion {
  id: string;
  name: string;
  normalizedKey: string;
  source: SuggestionSource;
  inCurrentGame: boolean;
  pinProtected: boolean;
  siteAppearanceCount: number;
  lastPlayedAtSite: string | null;
  currentGameTeamGameId: string | null;
  sessionControlMode: TeamGameSessionControlMode | null;
}

interface SuggestionAccumulator {
  id: string;
  name: string;
  normalizedKey: string;
  source: SuggestionSource;
  inCurrentGame: boolean;
  pinProtected: boolean;
  siteAppearanceCount: number;
  lastPlayedAtSite: Date | null;
  currentGameTeamGameId: string | null;
  sessionControlMode: TeamGameSessionControlMode | null;
}

function normalizeTeamNameForCompare(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isBetterSuggestion(
  candidate: SuggestionAccumulator,
  existing: SuggestionAccumulator
): boolean {
  if (candidate.inCurrentGame !== existing.inCurrentGame) {
    return candidate.inCurrentGame;
  }

  if (candidate.pinProtected !== existing.pinProtected) {
    return candidate.pinProtected;
  }

  const candidateLastPlayed = candidate.lastPlayedAtSite?.getTime() ?? 0;
  const existingLastPlayed = existing.lastPlayedAtSite?.getTime() ?? 0;

  if (candidateLastPlayed !== existingLastPlayed) {
    return candidateLastPlayed > existingLastPlayed;
  }

  if (candidate.siteAppearanceCount !== existing.siteAppearanceCount) {
    return candidate.siteAppearanceCount > existing.siteAppearanceCount;
  }

  return candidate.name.localeCompare(existing.name) < 0;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;

  try {
    const game = await prisma.game.findUnique({
      where: { joinCode },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledFor: true,
        teamGames: {
          select: {
            id: true,
            sessionControlMode: true,
            team: {
              select: {
                id: true,
                name: true,
                pin: true,
              },
            },
          },
        },
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
                    address: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const site = game.season.event.site ?? null;

    if (!site) {
      return NextResponse.json({
        id: game.id,
        title: game.title,
        status: game.status,
        scheduledFor: game.scheduledFor,
        seasonId: game.season.id,
        seasonName: game.season.name,
        eventId: game.season.event.id,
        eventName: game.season.event.name,
        site: null,
        teams: [],
      });
    }

    const siteTeamGames = await prisma.teamGame.findMany({
      where: {
        siteId: site.id,
      },
      select: {
        id: true,
        gameId: true,
        sessionControlMode: true,
        team: {
          select: {
            id: true,
            name: true,
            pin: true,
          },
        },
        game: {
          select: {
            scheduledFor: true,
          },
        },
      },
      orderBy: [
        {
          game: {
            scheduledFor: 'desc',
          },
        },
        {
          id: 'desc',
        },
      ],
    });

    const suggestionMap = new Map<string, SuggestionAccumulator>();

    for (const currentTeamGame of game.teamGames) {
      const normalizedKey = normalizeTeamNameForCompare(
        currentTeamGame.team.name
      );

      const existing = suggestionMap.get(normalizedKey);

      const nextSuggestion: SuggestionAccumulator = {
        id: currentTeamGame.team.id,
        name: currentTeamGame.team.name,
        normalizedKey,
        source: 'CURRENT_GAME',
        inCurrentGame: true,
        pinProtected: Boolean(currentTeamGame.team.pin),
        siteAppearanceCount: 0,
        lastPlayedAtSite: game.scheduledFor,
        currentGameTeamGameId: currentTeamGame.id,
        sessionControlMode: currentTeamGame.sessionControlMode,
      };

      if (!existing || isBetterSuggestion(nextSuggestion, existing)) {
        suggestionMap.set(normalizedKey, nextSuggestion);
      }
    }

    const siteStatsMap = new Map<
      string,
      {
        appearanceCount: number;
        lastPlayedAtSite: Date | null;
      }
    >();

    for (const teamGame of siteTeamGames) {
      const normalizedKey = normalizeTeamNameForCompare(teamGame.team.name);
      const existingStats = siteStatsMap.get(normalizedKey);

      const playedAt = teamGame.game.scheduledFor;

      if (!existingStats) {
        siteStatsMap.set(normalizedKey, {
          appearanceCount: 1,
          lastPlayedAtSite: playedAt,
        });
        continue;
      }

      const priorTime = existingStats.lastPlayedAtSite?.getTime() ?? 0;
      const nextTime = playedAt?.getTime() ?? 0;

      existingStats.appearanceCount += 1;
      if (nextTime > priorTime) {
        existingStats.lastPlayedAtSite = playedAt;
      }
    }

    for (const teamGame of siteTeamGames) {
      const normalizedKey = normalizeTeamNameForCompare(teamGame.team.name);
      const stats = siteStatsMap.get(normalizedKey);

      const existing = suggestionMap.get(normalizedKey);

      const nextSuggestion: SuggestionAccumulator = {
        id: teamGame.team.id,
        name: teamGame.team.name,
        normalizedKey,
        source: game.teamGames.some(
          (currentTeamGame) =>
            normalizeTeamNameForCompare(currentTeamGame.team.name) ===
            normalizedKey
        )
          ? 'CURRENT_GAME'
          : 'KNOWN_SITE',
        inCurrentGame: game.teamGames.some(
          (currentTeamGame) =>
            normalizeTeamNameForCompare(currentTeamGame.team.name) ===
            normalizedKey
        ),
        pinProtected: Boolean(teamGame.team.pin),
        siteAppearanceCount: stats?.appearanceCount ?? 1,
        lastPlayedAtSite: stats?.lastPlayedAtSite ?? teamGame.game.scheduledFor,
        currentGameTeamGameId:
          game.teamGames.find(
            (currentTeamGame) =>
              normalizeTeamNameForCompare(currentTeamGame.team.name) ===
              normalizedKey
          )?.id ?? null,
        sessionControlMode:
          game.teamGames.find(
            (currentTeamGame) =>
              normalizeTeamNameForCompare(currentTeamGame.team.name) ===
              normalizedKey
          )?.sessionControlMode ?? null,
      };

      if (!existing || isBetterSuggestion(nextSuggestion, existing)) {
        suggestionMap.set(normalizedKey, nextSuggestion);
      } else if (existing) {
        existing.siteAppearanceCount = Math.max(
          existing.siteAppearanceCount,
          nextSuggestion.siteAppearanceCount
        );

        const existingLastPlayed =
          existing.lastPlayedAtSite?.getTime() ?? 0;
        const nextLastPlayed =
          nextSuggestion.lastPlayedAtSite?.getTime() ?? 0;

        if (nextLastPlayed > existingLastPlayed) {
          existing.lastPlayedAtSite = nextSuggestion.lastPlayedAtSite;
        }
      }
    }

    const teams: JoinTeamSuggestion[] = Array.from(suggestionMap.values())
      .map((team) => ({
        id: team.id,
        name: team.name,
        normalizedKey: team.normalizedKey,
        source: team.source,
        inCurrentGame: team.inCurrentGame,
        pinProtected: team.pinProtected,
        siteAppearanceCount: team.siteAppearanceCount,
        lastPlayedAtSite: team.lastPlayedAtSite
          ? team.lastPlayedAtSite.toISOString()
          : null,
        currentGameTeamGameId: team.currentGameTeamGameId,
        sessionControlMode: team.sessionControlMode,
      }))
      .sort((a, b) => {
        if (a.inCurrentGame !== b.inCurrentGame) {
          return a.inCurrentGame ? -1 : 1;
        }

        if (a.pinProtected !== b.pinProtected) {
          return a.pinProtected ? -1 : 1;
        }

        const aLastPlayed = a.lastPlayedAtSite
          ? new Date(a.lastPlayedAtSite).getTime()
          : 0;
        const bLastPlayed = b.lastPlayedAtSite
          ? new Date(b.lastPlayedAtSite).getTime()
          : 0;

        if (aLastPlayed !== bLastPlayed) {
          return bLastPlayed - aLastPlayed;
        }

        if (a.siteAppearanceCount !== b.siteAppearanceCount) {
          return b.siteAppearanceCount - a.siteAppearanceCount;
        }

        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      id: game.id,
      title: game.title,
      status: game.status,
      scheduledFor: game.scheduledFor,
      seasonId: game.season.id,
      seasonName: game.season.name,
      eventId: game.season.event.id,
      eventName: game.season.event.name,
      site,
      teams,
    });
  } catch (err) {
    console.error(
      'Error loading game by join code:',
      err instanceof Error ? err.message : String(err)
    );

    return NextResponse.json(
      { error: 'Failed to load game' },
      { status: 500 }
    );
  }
}