'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft } from 'lucide-react';
import AddRoundModal, { RoundConfig } from '@/components/AddRoundModal';
import AddQuestionModal, { QuestionConfig } from '@/components/AddQuestionModal';
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

// Utility to reorder an array
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

  // Redirect unauthorized
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

  const [showAddRound, setShowAddRound] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Fetch rounds
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

  // Auto-select first round
  useEffect(() => {
    if (rounds.length > 0 && !selectedRound) {
      setSelectedRound(rounds[0]);
    }
  }, [rounds, selectedRound]);

  // Fetch questions when round changes
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
    return <div className="p-6">Loading rounds...</div>;
  }

  return (
    <div className="py-4 px-6 bg-gray-100 grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Header */}
      <div className="col-span-12 flex items-center mb-2">
        <Link
          href="/dashboard/host"
          className="inline-flex items-center text-blue-600 hover:underline"
        >
          <ChevronLeft className="mr-1" size={18} /> Back
        </Link>
        <h1 className="text-2xl font-bold ml-4">Edit Game</h1>
      </div>

      {/* Rounds Panel */}
      <div className="col-span-12 md:col-span-4 bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Rounds</h2>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => setShowAddRound(true)}
          >
            + Add Round
          </button>
        </div>

        <DragDropContext
  onDragEnd={async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;

    let newRounds = reorder(rounds, source.index, destination.index);

    // Update sortOrder to reflect new indices (starting from 1)
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
                className="space-y-2"
              >
                {rounds.map((r, index) => (
                  <Draggable key={r.id} draggableId={r.id} index={index}>
                  {(prov) => (
                    <li
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className={`flex items-center p-3 rounded shadow cursor-pointer transition-colors ${
                        selectedRound?.id === r.id
                          ? 'bg-blue-500 text-white'  // Primary background and white text when selected
                          : 'bg-white text-gray-800'  // Default background and text
                      }`}
                      onClick={() => setSelectedRound(r)}
                    >
                      <span
                        {...prov.dragHandleProps}
                        className={`mr-2 cursor-move select-none ${
                          selectedRound?.id === r.id ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        ⋮⋮
                      </span>
                      <span className="flex-1">
                        {r.sortOrder}. {r.name}
                      </span>
                      <span
                        className={`text-sm ${
                          selectedRound?.id === r.id ? 'text-gray-200' : 'text-gray-600'
                        }`}
                      >
                        {r.roundType}
                      </span>
                    </li>
                  )}
                </Draggable>
                
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Questions Panel */}
<div className="col-span-12 md:col-span-8 bg-white p-4 rounded shadow">
  <div className="flex justify-between items-center mb-3">
    <h2 className="text-xl font-semibold">
      Questions{selectedRound ? ` – ${selectedRound.name}` : ''}
    </h2>
    {selectedRound ? (
      <button
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={() => setShowAddQuestion(true)}
      >
        + Add Question
      </button>
    ) : (
      <span className="text-gray-500">Select a round to add questions</span>
    )}
  </div>

  {selectedRound ? (
    <DragDropContext
    onDragEnd={async (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || destination.index === source.index) return;
  
      let newQuestions = reorder(questions, source.index, destination.index);
  
      // Update sortOrder to reflect new indices (starting from 1)
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
            className="space-y-2"
          >
            {questions.map((q, idx) => (
              <Draggable key={q.id} draggableId={q.id} index={idx}>
                {(prov) => (
                  <li
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    className="p-2 border rounded flex items-center justify-between bg-white"
                  >
                    {/* drag-handle */}
                    <span
                      {...prov.dragHandleProps}
                      className="mr-2 cursor-move text-gray-500 select-none"
                    >
                      ⋮⋮
                    </span>

                    {/* question text */}
                    <div className="flex-1">
                      <div className="font-medium">
                        {q.sortOrder}. {q.text}
                      </div>
                      <div className="text-sm text-gray-600">
                        Type: {q.type}
                      </div>
                    </div>

                    {/* edit button */}
                    <button
  className="ml-4 px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
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
    <p className="text-gray-600">No round selected.</p>
  )}
</div>

      {/* Modals */}
      <AddRoundModal
        isOpen={showAddRound}
        onClose={() => setShowAddRound(false)}
        onSave={async (config: RoundConfig) => {
          const res = await fetch(
            `/api/host/games/${gameId}/rounds`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config),
            }
          );
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
    setQuestionToEdit(null); // this stays
    setShowAddQuestion(false);
  }}
          onSave={async (config, idToUpdate) => {
            if (idToUpdate) {
              // UPDATE existing question
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
              // CREATE new question
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
          question={questionToEdit ?? undefined} // ✅ fix type error
        />
      )}
    </div>
  );
}
