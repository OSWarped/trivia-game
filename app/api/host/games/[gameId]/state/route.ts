// File: /app/api/games/[gameId]/state/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient }    from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params

  //const url    = new URL(_req.url)
  //const teamId = url.searchParams.get('teamId')
  //if (!teamId) {
  //  return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  //}

  // 1) Make sure team is in game
  // const teamGame = await prisma.teamGame.findUnique({
  //   where: { teamId_gameId: { teamId, gameId } },
  //   include: {
  //     team:    { select: { id: true, name: true } },
  //     answers: { select: {
  //       questionId:    true,
  //       given:         true,
  //       isCorrect:     true,
  //       awardedPoints: true,
  //       pointsUsed:    true
  //     }}
  //   }
  // })
  // if (!teamGame) {
  //   return NextResponse.json({ error: 'Team not found in game' }, { status: 404 })
  // }

  // 2) Load the shared GameState + its Game, Rounds, Questions, TeamGames
  const gs = await prisma.gameState.findUnique({
    where: { gameId },
    include: {
      game: {
        include: {
          rounds: {
            orderBy: { sortOrder: 'asc' },
            include: {
              questions: {
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  text: true,
                  type: true,
                  sortOrder: true,
                  options: {
                    select: {
                      id: true,
                      text: true,
                      isCorrect: true,
                    }
                  }
                }
              }
            }
          },
          teamGames: {
            include: {
              team: { select: { id: true, name: true } },
              answers: {
                select: {
                  questionId:    true,
                  given:         true,
                  isCorrect:     true,
                  awardedPoints: true,
                  pointsUsed:    true,
                }
              }
            }
          }
        }
      }
    }
  });
  if (!gs) {
    return NextResponse.json({ error: 'Game state not found' }, { status: 404 })
  }

  // 3) Assemble the payload to match your GameStateExpanded
  const payload = {
    gameId:             gs.gameId,
    currentRoundId:     gs.currentRoundId,
    currentQuestionId:  gs.currentQuestionId,
    pointsRemaining:    gs.pointsRemaining,
    questionStartedAt:  gs.questionStartedAt?.toISOString() ?? null,
    isAcceptingAnswers: gs.isAcceptingAnswers,
    createdAt:          gs.createdAt.toISOString(),
    updatedAt:          gs.updatedAt.toISOString(),

    game: {
      id:     gs.gameId,
      status: gs.game.status,

      rounds: gs.game.rounds.map((r) => ({
        id:         r.id,
        name:       r.name,
        pointSystem:r.pointSystem,
        // only expose the pool for POOL rounds
        pointPool:  r.pointSystem === 'POOL' ? r.pointPool : undefined,
        // only expose the value for FLAT rounds
        pointValue: r.pointSystem === 'FLAT' ? r.pointValue : undefined,
        questions:  r.questions.map((q) => ({
          id:        q.id,
          text:      q.text,
          type:      q.type,
          sortOrder: q.sortOrder,
          options: q.options
        }))
      })),

      teamGames: gs.game.teamGames.map((tg) => ({
        team: {
          id:   tg.team.id,
          name: tg.team.name
        },
        score:   tg.totalPts,
        answers: tg.answers.map((a) => ({
          questionId:    a.questionId,
          given:         a.given,
          isCorrect:     a.isCorrect,
          awardedPoints: a.awardedPoints,
          pointsUsed:    a.pointsUsed
        }))
      }))
    }
  } as const

  return NextResponse.json(payload)
}
