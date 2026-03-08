import { NextResponse } from 'next/server';
import {
    PointSystem,
    PrismaClient,
    QuestionType,
    RoundType,
} from '@prisma/client';

const prisma = new PrismaClient();

type ImportOptionInput = {
    text?: unknown;
    isCorrect?: unknown;
    sortOrder?: unknown;
};

type ImportQuestionInput = {
    text?: unknown;
    type?: unknown;
    sortOrder?: unknown;
    options?: unknown;
};

type ImportRoundInput = {
    name?: unknown;
    roundType?: unknown;
    pointSystem?: unknown;
    maxPoints?: unknown;
    pointValue?: unknown;
    pointPool?: unknown;
    timeLimit?: unknown;
    wagerLimit?: unknown;
    sortOrder?: unknown;
    questions?: unknown;
};

type ImportGameInput = {
    title?: unknown;
    tag?: unknown;
    rounds?: unknown;
};

type NormalizedOption = {
    text: string;
    isCorrect: boolean;
    sortOrder: number | null;
};

type NormalizedQuestion = {
    text: string;
    type: QuestionType;
    sortOrder: number;
    options: NormalizedOption[];
};

type NormalizedRound = {
    name: string;
    roundType: RoundType;
    pointSystem: PointSystem;
    maxPoints: number | null;
    pointValue: number | null;
    pointPool: number[];
    timeLimit: number | null;
    wagerLimit: number | null;
    sortOrder: number;
    questions: NormalizedQuestion[];
};

type NormalizedImportGame = {
    title: string | null;
    tag: string | null;
    rounds: NormalizedRound[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function asTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function asRequiredInteger(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isInteger(value)) return null;
    return value;
}

function asOptionalInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'number' || !Number.isInteger(value)) return null;
    return value;
}

function parseRoundType(value: unknown): RoundType | null {
    return typeof value === 'string' &&
        Object.values(RoundType).includes(value as RoundType)
        ? (value as RoundType)
        : null;
}

function parsePointSystem(value: unknown): PointSystem | null {
    return typeof value === 'string' &&
        Object.values(PointSystem).includes(value as PointSystem)
        ? (value as PointSystem)
        : null;
}

function parseQuestionType(value: unknown): QuestionType | null {
    return typeof value === 'string' &&
        Object.values(QuestionType).includes(value as QuestionType)
        ? (value as QuestionType)
        : null;
}

function parsePointPool(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;

    const parsed: number[] = [];

    for (const item of value) {
        if (typeof item !== 'number' || !Number.isInteger(item)) {
            return null;
        }
        parsed.push(item);
    }

    return parsed;
}

function pushError(errors: string[], path: string, message: string) {
    errors.push(`${path}: ${message}`);
}

function validateAndNormalizeImport(
    input: unknown
): {
    normalized: NormalizedImportGame | null;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isRecord(input)) {
        return {
            normalized: null,
            errors: ['root: payload must be a JSON object'],
            warnings,
        };
    }

    const raw = input as ImportGameInput;

    const title =
        raw.title === undefined || raw.title === null
            ? null
            : asTrimmedString(raw.title);

    const tag =
        raw.tag === undefined || raw.tag === null
            ? null
            : asTrimmedString(raw.tag);

    if (!Array.isArray(raw.rounds)) {
        return {
            normalized: null,
            errors: ['rounds: rounds must be an array'],
            warnings,
        };
    }

    const normalizedRounds: NormalizedRound[] = [];
    const roundSortOrders = new Set<number>();

    raw.rounds.forEach((roundValue, roundIndex) => {
        const roundPath = `rounds[${roundIndex}]`;

        if (!isRecord(roundValue)) {
            pushError(errors, roundPath, 'round must be an object');
            return;
        }

        const round = roundValue as ImportRoundInput;

        const name = asTrimmedString(round.name);
        if (!name) {
            pushError(errors, `${roundPath}.name`, 'name is required');
        }

        const roundType = parseRoundType(round.roundType);
        if (!roundType) {
            pushError(
                errors,
                `${roundPath}.roundType`,
                `roundType must be one of ${Object.values(RoundType).join(', ')}`
            );
        }

        const pointSystem = parsePointSystem(round.pointSystem);
        if (!pointSystem) {
            pushError(
                errors,
                `${roundPath}.pointSystem`,
                `pointSystem must be one of ${Object.values(PointSystem).join(', ')}`
            );
        }

        const sortOrder = asRequiredInteger(round.sortOrder);
        if (sortOrder === null) {
            pushError(errors, `${roundPath}.sortOrder`, 'sortOrder must be an integer');
        } else if (roundSortOrders.has(sortOrder)) {
            pushError(
                errors,
                `${roundPath}.sortOrder`,
                `duplicate round sortOrder ${sortOrder}`
            );
        } else {
            roundSortOrders.add(sortOrder);
        }

        const maxPoints = asOptionalInteger(round.maxPoints);
        const pointValue = asOptionalInteger(round.pointValue);
        const pointPool =
            round.pointPool === undefined || round.pointPool === null
                ? []
                : parsePointPool(round.pointPool);

        if (pointPool === null) {
            pushError(
                errors,
                `${roundPath}.pointPool`,
                'pointPool must be an array of integers'
            );
        }

        const timeLimit = asOptionalInteger(round.timeLimit);
        const wagerLimit = asOptionalInteger(round.wagerLimit);

        if (
            pointSystem === PointSystem.FLAT &&
            roundType !== RoundType.WAGER &&
            pointValue === null
        ) {
            pushError(
                errors,
                `${roundPath}.pointValue`,
                'pointValue is required for FLAT rounds unless roundType is WAGER'
            );
        }

        if (
            pointSystem === PointSystem.POOL &&
            maxPoints === null &&
            (!pointPool || pointPool.length === 0)
        ) {
            pushError(
                errors,
                `${roundPath}`,
                'POOL rounds should define maxPoints or a non-empty pointPool'
            );
        }

        if (roundType === RoundType.TIME_BASED && timeLimit === null) {
            warnings.push(
                `${roundPath}.timeLimit: timeLimit is recommended for TIME_BASED rounds`
            );
        }

        if (roundType === RoundType.WAGER && wagerLimit === null) {
            warnings.push(
                `${roundPath}.wagerLimit: wagerLimit is recommended for WAGER rounds`
            );
        }

        if (!Array.isArray(round.questions)) {
            pushError(errors, `${roundPath}.questions`, 'questions must be an array');
            return;
        }

        const normalizedQuestions: NormalizedQuestion[] = [];
        const questionSortOrders = new Set<number>();

        round.questions.forEach((questionValue, questionIndex) => {
            const questionPath = `${roundPath}.questions[${questionIndex}]`;

            if (!isRecord(questionValue)) {
                pushError(errors, questionPath, 'question must be an object');
                return;
            }

            const question = questionValue as ImportQuestionInput;

            const text = asTrimmedString(question.text);
            if (!text) {
                pushError(errors, `${questionPath}.text`, 'text is required');
            }

            const type = parseQuestionType(question.type);
            if (!type) {
                pushError(
                    errors,
                    `${questionPath}.type`,
                    `type must be one of ${Object.values(QuestionType).join(', ')}`
                );
            }

            const questionSortOrder = asRequiredInteger(question.sortOrder);
            if (questionSortOrder === null) {
                pushError(
                    errors,
                    `${questionPath}.sortOrder`,
                    'sortOrder must be an integer'
                );
            } else if (questionSortOrders.has(questionSortOrder)) {
                pushError(
                    errors,
                    `${questionPath}.sortOrder`,
                    `duplicate question sortOrder ${questionSortOrder}`
                );
            } else {
                questionSortOrders.add(questionSortOrder);
            }

            if (!Array.isArray(question.options)) {
                pushError(errors, `${questionPath}.options`, 'options must be an array');
                return;
            }

            const normalizedOptions: NormalizedOption[] = [];
            let correctCount = 0;

            question.options.forEach((optionValue, optionIndex) => {
                const optionPath = `${questionPath}.options[${optionIndex}]`;

                if (!isRecord(optionValue)) {
                    pushError(errors, optionPath, 'option must be an object');
                    return;
                }

                const option = optionValue as ImportOptionInput;

                const optionText = asTrimmedString(option.text);
                if (!optionText) {
                    pushError(errors, `${optionPath}.text`, 'text is required');
                }

                if (typeof option.isCorrect !== 'boolean') {
                    pushError(
                        errors,
                        `${optionPath}.isCorrect`,
                        'isCorrect must be true or false'
                    );
                }

                const optionSortOrder = asOptionalInteger(option.sortOrder);

                if (option.isCorrect === true) {
                    correctCount += 1;
                }

                normalizedOptions.push({
                    text: optionText ?? '',
                    isCorrect: option.isCorrect === true,
                    sortOrder: optionSortOrder,
                });
            });

            if (correctCount === 0) {
                pushError(
                    errors,
                    `${questionPath}.options`,
                    'at least one option must be marked isCorrect=true'
                );
            }

            if (type === QuestionType.ORDERED) {
                const missingSortOrders = normalizedOptions.some(
                    (option) => option.sortOrder === null
                );
                if (missingSortOrders) {
                    pushError(
                        errors,
                        `${questionPath}.options`,
                        'ORDERED questions should provide sortOrder on each option'
                    );
                }
            }

            normalizedQuestions.push({
                text: text ?? '',
                type: type ?? QuestionType.SINGLE,
                sortOrder: questionSortOrder ?? questionIndex + 1,
                options: normalizedOptions,
            });
        });

        normalizedRounds.push({
            name: name ?? '',
            roundType: roundType ?? RoundType.POINT_BASED,
            pointSystem: pointSystem ?? PointSystem.FLAT,
            maxPoints,
            pointValue,
            pointPool: pointPool ?? [],
            timeLimit,
            wagerLimit,
            sortOrder: sortOrder ?? roundIndex + 1,
            questions: normalizedQuestions,
        });
    });

    if (normalizedRounds.length === 0) {
        errors.push('rounds: at least one round is required');
    }

    if (errors.length > 0) {
        return {
            normalized: null,
            errors,
            warnings,
        };
    }

    return {
        normalized: {
            title,
            tag,
            rounds: normalizedRounds,
        },
        errors,
        warnings,
    };
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ gameId: string }> }
) {
    try {
        const { gameId } = await params;

        const game = await prisma.game.findUnique({
            where: { id: gameId },
            select: {
                id: true,
                status: true,
            },
        });

        if (!game) {
            return NextResponse.json(
                { ok: false, error: 'Game not found.' },
                { status: 404 }
            );
        }

        const body = (await req.json()) as unknown;
        const { normalized, errors, warnings } = validateAndNormalizeImport(body);

        return NextResponse.json({
            ok: errors.length === 0,
            errors,
            warnings,
            summary: normalized
                ? {
                    roundCount: normalized.rounds.length,
                    questionCount: normalized.rounds.reduce(
                        (sum, round) => sum + round.questions.length,
                        0
                    ),
                    optionCount: normalized.rounds.reduce(
                        (sum, round) =>
                            sum +
                            round.questions.reduce(
                                (questionSum, question) =>
                                    questionSum + question.options.length,
                                0
                            ),
                        0
                    ),
                }
                : null,
            preview: normalized,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        console.error('Failed to preview game import', { message });

        return NextResponse.json(
            {
                ok: false,
                error: 'Failed to preview import.',
            },
            { status: 500 }
        );
    }
}