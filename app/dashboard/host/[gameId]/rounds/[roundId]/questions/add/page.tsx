'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Subquestion {
  text: string;
  correctAnswer: string;
}

export default function AddQuestion() {
  const { gameId, roundId } = useParams();
  const router = useRouter();

  const [text, setText] = useState('');
  const [type, setType] = useState('SINGLE'); // Default question type
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [sortOrder, setSortOrder] = useState<number | ''>(''); // Sort order textbox
  const [subquestions, setSubquestions] = useState<Subquestion[]>([]);
  const [error, setError] = useState('');

  const addSubquestion = () => {
    setSubquestions([...subquestions, { text: '', correctAnswer: '' }]);
  };

  const updateSubquestion = (index: number, field: string, value: string) => {
    const updated = [...subquestions];
    updated[index] = { ...updated[index], [field]: value };
    setSubquestions(updated);
  };

  const removeSubquestion = (index: number) => {
    const updated = subquestions.filter((_, i) => i !== index);
    setSubquestions(updated);
  };

  const handleSubmit = async () => {
    if (!text.trim() || !type) {
      setError('Question text and type are required.');
      return;
    }
  
    try {
      const questionPayload = {
        text,
        type,
        sortOrder: Number(sortOrder),
        correctAnswer,
        subquestions: subquestions.map((sub) => ({
          text: sub.text,
          correctAnswer: sub.correctAnswer,
        })),
      };
  
      const response = await fetch(`/api/host/games/${gameId}/rounds/${roundId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionPayload),
      });
  
      if (response.ok) {
        router.push(`/dashboard/host/${gameId}/edit-round/${roundId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add question.');
      }
    } catch (err) {
      console.error('Error submitting question:', err);
      setError('An error occurred while adding the question.');
    }
  };
  

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-3xl font-semibold text-center mb-8">Add Question</h1>
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}

      {/* Main Question */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Question Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          placeholder="Enter the main question text here..."
        />
      </div>

      {/* Question Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Question Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="SINGLE">Single Answer</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="ORDERED">Put in Order</option>
          <option value="WAGER">Wager</option>
          <option value="IMAGE">Image Based</option>
        </select>
      </div>

       {/* Sort Order */}
       <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Sort Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter the sort order for this question"
        />
      </div>

      {/* Correct Answer */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
        <input
          type="text"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          className="mt-2 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter the correct answer"
        />
      </div>

      {/* Subquestions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Subquestions</h2>
        {subquestions.map((sub, index) => (
          <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
            <label className="block text-sm font-medium text-gray-700">Subquestion Text</label>
            <input
              type="text"
              value={sub.text}
              onChange={(e) => updateSubquestion(index, 'text', e.target.value)}
              className="mt-2 w-full p-2 border border-gray-300 rounded-md"
              placeholder={`Subquestion ${index + 1}`}
            />
            <label className="block text-sm font-medium text-gray-700 mt-4">Correct Answer</label>
            <input
              type="text"
              value={sub.correctAnswer}
              onChange={(e) => updateSubquestion(index, 'correctAnswer', e.target.value)}
              className="mt-2 w-full p-2 border border-gray-300 rounded-md"
              placeholder="Correct answer for this subquestion"
            />
            <button
              className="mt-4 text-red-500"
              onClick={() => removeSubquestion(index)}
            >
              Remove Subquestion
            </button>
          </div>
        ))}
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={addSubquestion}
        >
          Add Subquestion
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-6">
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={() => router.push(`/dashboard/host/${gameId}/rounds/${roundId}`)}
        >
          Cancel
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handleSubmit}
        >
          Add Question
        </button>
      </div>
    </div>
  );
}
