'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft } from 'lucide-react';
import AddRoundModal, { RoundConfig } from '@/components/AddRoundModal';
import AddQuestionModal, { QuestionConfig } from '@/components/AddQuestionModal';
import AppBackground from '@/components/AppBackground';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

interface Round {
  id: string;
  name: string;
  roundType: string;
  sortOrder: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
  sortOrder: number;
}

function reorder<T>(list: T[], start: number, end: number): T[] {
  const result = Array.from(list);
  const [moved] = result.splice(start, 1);
  result.splice(end, 0, moved);
  return result;
}

export default function EditGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, isHost, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || (!isHost && !isAdmin)) {
      router.push('/login');
    }
  }, [user, isHost, isAdmin, router]);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionToEdit, setQuestionToEdit] = useState<(QuestionConfig & { id: string }) | null>(null);
  const [gameTitle, setGameTitle] = useState<string | null>(null);

  const [showAddRound, setShowAddRound] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}/rounds`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as Round[];
          setRounds(data);
        } else {
          console.error('Failed to load rounds', await res.json());
        }
      } catch (err) {
        console.error('Error fetching rounds:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/host/games/${gameId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setGameTitle(data.title);
        } else {
          console.error('Failed to load game title', await res.json());
        }
      } catch (err) {
        console.error('Error fetching game title:', err);
      }
    })();
  }, [gameId]);

  useEffect(() => {
    if (rounds.length > 0 && !selectedRound) {
      setSelectedRound(rounds[0]);
    }
  }, [rounds, selectedRound]);

  useEffect(() => {
    if (!selectedRound) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/host/rounds/${selectedRound.id}/questions`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = (await res.json()) as Question[];
          setQuestions(data);
        } else {
          console.error('Failed to load questions', await res.json());
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      }
    })();
  }, [selectedRound]);

  if (loading) {
    return (
      <AppBackground variant="dashboard">
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
            Loading rounds...
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground variant="dashboard">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <Link
              href="/dashboard/host"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <ChevronLeft size={18} />
              Back to Host Dashboard
            </Link>
          </div>

          <header className="rounded-3xl border border-white/10 bg-white/80 px-6 py-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Content Editor
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {gameTitle ? `Edit ${gameTitle}` : 'Edit Game'}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Manage round order, question order, and game content structure.
                </p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <section className="col-span-12 rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm md:col-span-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Rounds</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Reorder rounds and select one to edit its questions.
                  </p>
                </div>

                <button
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => setShowAddRound(true)}
                >
                  Add Round
                </button>
              </div>

              <DragDropContext
                onDragEnd={async (result: DropResult) => {
                  const { source, destination } = result;
                  if (!destination || destination.index === source.index) return;

                  let newRounds = reorder(rounds, source.index, destination.index);

                  newRounds = newRounds.map((round, index) => ({
                    ...round,
                    sortOrder: index + 1,
                  }));

                  setRounds(newRounds);

                  try {
                    await fetch(`/api/host/games/${gameId}/rounds/reorder`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        order: newRounds.map((r) => r.id),
                      }),
                    });
                  } catch (err) {
                    console.error('Failed to save new round order', err);
                  }
                }}
              >
                <Droppable droppableId="rounds-droppable">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {rounds.map((r, index) => (
                        <Draggable key={r.id} draggableId={r.id} index={index}>
                          {(prov) => (
                            <li
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`flex items-center rounded-2xl border p-4 shadow-sm transition ${selectedRound?.id === r.id
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                                }`}
                              onClick={() => setSelectedRound(r)}
                            >
                              <span
                                {...prov.dragHandleProps}
                                className={`mr-3 cursor-move select-none text-lg ${selectedRound?.id === r.id
                                    ? 'text-slate-200'
                                    : 'text-slate-400'
                                  }`}
                              >
                                ⋮⋮
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="font-medium">
                                  {r.sortOrder}. {r.name}
                                </div>
                                <div
                                  className={`mt-1 text-sm ${selectedRound?.id === r.id
                                      ? 'text-slate-300'
                                      : 'text-slate-500'
                                    }`}
                                >
                                  {r.roundType}
                                </div>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </section>

            <section className="col-span-12 rounded-3xl border border-white/10 bg-white/80 p-5 shadow-xl backdrop-blur-sm md:col-span-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Questions{selectedRound ? ` – ${selectedRound.name}` : ''}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Reorder and edit the questions in the selected round.
                  </p>
                </div>

                {selectedRound ? (
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    onClick={() => setShowAddQuestion(true)}
                  >
                    Add Question
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">
                    Select a round to add questions
                  </span>
                )}
              </div>

              {selectedRound ? (
                <DragDropContext
                  onDragEnd={async (result: DropResult) => {
                    const { source, destination } = result;
                    if (!destination || destination.index === source.index) return;

                    let newQuestions = reorder(questions, source.index, destination.index);

                    newQuestions = newQuestions.map((question, index) => ({
                      ...question,
                      sortOrder: index + 1,
                    }));

                    setQuestions(newQuestions);

                    try {
                      await fetch(`/api/host/rounds/${selectedRound.id}/questions/reorder`, {
                        method: 'PATCH',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          order: newQuestions.map((q) => q.id),
                        }),
                      });
                    } catch (err) {
                      console.error('Failed to save new question order', err);
                    }
                  }}
                >
                  <Droppable droppableId="questions-droppable">
                    {(provided) => (
                      <ul
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-3"
                      >
                        {questions.map((q, idx) => (
                          <Draggable key={q.id} draggableId={q.id} index={idx}>
                            {(prov) => (
                              <li
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                              >
                                <div className="flex min-w-0 flex-1 items-start">
                                  <span
                                    {...prov.dragHandleProps}
                                    className="mr-3 cursor-move select-none text-lg text-slate-400"
                                  >
                                    ⋮⋮
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-slate-900">
                                      {q.sortOrder}. {q.text}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                      Type: {q.type}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  className="ml-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/host/questions/${q.id}`, {
                                        credentials: 'include',
                                      });
                                      if (res.ok) {
                                        const fullQuestion = await res.json();
                                        setQuestionToEdit(fullQuestion);
                                        setShowAddQuestion(true);
                                      } else {
                                        console.error('Failed to load question', await res.json());
                                      }
                                    } catch (err) {
                                      console.error('Error fetching question', err);
                                    }
                                  }}
                                >
                                  Edit
                                </button>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                  <div className="text-lg font-semibold text-slate-900">
                    No round selected
                  </div>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                    Choose a round from the left to begin editing its questions.
                  </p>
                </div>
              )}
            </section>
          </div>

          <AddRoundModal
            isOpen={showAddRound}
            onClose={() => setShowAddRound(false)}
            onSave={async (config: RoundConfig) => {
              const res = await fetch(`/api/host/games/${gameId}/rounds`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
              });
              if (res.ok) {
                const added = (await res.json()) as Round;
                setRounds((rs) => [...rs, added]);
              } else {
                console.error('Round creation failed', await res.json());
              }
              setShowAddRound(false);
            }}
          />

          {selectedRound && (
            <AddQuestionModal
              isOpen={showAddQuestion}
              onClose={() => {
                setQuestionToEdit(null);
                setShowAddQuestion(false);
              }}
              onSave={async (config, idToUpdate) => {
                if (idToUpdate) {
                  const res = await fetch(`/api/host/questions/${idToUpdate}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config),
                  });

                  if (res.ok) {
                    const updated = await res.json();
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.id === updated.id ? { ...q, text: updated.text, type: updated.type } : q
                      )
                    );
                  } else {
                    console.error('Failed to update question', await res.json());
                  }
                } else {
                  const res = await fetch(`/api/host/rounds/${selectedRound.id}/questions`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config),
                  });

                  if (res.ok) {
                    const newQ = await res.json();
                    setQuestions((qs) => [...qs, newQ]);
                  } else {
                    console.error('Question creation failed', await res.json());
                  }
                }
              }}
              question={questionToEdit ?? undefined}
            />
          )}
        </div>
      </div>
    </AppBackground>
  );
}