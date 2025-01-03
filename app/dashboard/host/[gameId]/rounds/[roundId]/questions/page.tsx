'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  type: string; // Question type (e.g., 'SINGLE', 'MULTIPLE_CHOICE', etc.)
  correctAnswerId: string | null; // Link to the correct answer for this question
}

export default function QuestionsPage() {
  const { gameId, roundId } = useParams(); // Get the gameId and roundId from URL params
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string>('');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newQuestionType, setNewQuestionType] = useState<string>('SINGLE');
  const [correctAnswerText, setCorrectAnswerText] = useState<string>(''); // Text for the correct answer

  useEffect(() => {
    if (!roundId) return; // Don't run if roundId is not available

    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions`);
        const data = await response.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Something went wrong while fetching questions.');
      }
    };

    fetchQuestions();
  }, [gameId, roundId]);

  const handleAddQuestion = async () => {
    const newQuestion = {
      text: newQuestionText,
      type: newQuestionType,
      roundId: roundId,
    };

    try {
      const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuestion),
      });

      if (response.ok) {
        const createdQuestion = await response.json();
        setQuestions([...questions, createdQuestion]);

        // Once the question is created, add the correct answer
        handleAddCorrectAnswer(createdQuestion.id); // Automatically call the correct answer API
        setNewQuestionText('');
        setNewQuestionType('SINGLE');
      } else {
        setError('Failed to add question');
      }
    } catch (err) {
      console.error(err);
      setError('Error adding question');
    }
  };

  const handleAddCorrectAnswer = async (questionId: string) => {
    const newCorrectAnswer = {
      answerText: correctAnswerText,
      questionId: questionId,
    };

    try {
      const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions/${questionId}/correct-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCorrectAnswer),
      });

      if (response.ok) {
        const createdCorrectAnswer = await response.json();
        setQuestions(
          questions.map((q) =>
            q.id === questionId ? { ...q, correctAnswerId: createdCorrectAnswer.id } : q
          )
        );
        setCorrectAnswerText('');
        setError('Correct Answer added successfully!');
      } else {
        setError('Failed to add correct answer');
      }
    } catch (err) {
      console.error(err);
      setError('Error adding correct answer');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== questionId));
      } else {
        setError('Failed to delete question');
      }
    } catch (err) {
      console.error(err);
      setError('Error deleting question');
    }
  };

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Questions for Round</h1>

      {/* Add a New Question */}
      <h2 className="text-2xl mb-4">Add a New Question</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Question Text</label>
        <input
          type="text"
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Default Question Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Question Type</label>
        <select
          value={newQuestionType}
          onChange={(e) => setNewQuestionType(e.target.value)}
          disabled
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="SINGLE">Single Answer</option>
        </select>
      </div>

      {/* Correct Answer Section */}
      <h3 className="text-2xl mt-4">Add Correct Answer</h3>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
        <input
          type="text"
          value={correctAnswerText}
          onChange={(e) => setCorrectAnswerText(e.target.value)}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={handleAddQuestion}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Question
      </button>

      {/* Existing Questions */}
      <h2 className="text-2xl mt-8">Existing Questions</h2>
      {questions.length === 0 ? (
        <p>No questions available for this round.</p>
      ) : (
        <ul className="space-y-4 mt-4">
          {questions.map((question) => (
            <li key={question.id} className="my-4 bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{question.text}</h3>
                  <p className="text-sm text-gray-600">{question.type}</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push(`/dashboard/host/${gameId}/rounds/${roundId}/questions/${question.id}`)} // View/Edit Question Details
                    className="text-blue-500 hover:text-blue-600"
                  >
                    Edit Question
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)} // Delete Question
                    className="text-red-500 hover:text-red-600"
                  >
                    Delete Question
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
