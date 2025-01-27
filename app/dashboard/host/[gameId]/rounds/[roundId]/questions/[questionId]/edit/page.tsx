"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Question = {
  id: string;
  text: string;
  type: string;
  pointValue: number | null;
  roundId: string;
  answers: string[];
  createdAt: string;
  updatedAt: string;
};

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { questionId } = params;

  const [formData, setFormData] = useState<Question | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error] = useState<string | null>(null);

  // Fetch question data
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await fetch(`/api/host/games/${params.gameId}/rounds/${params.roundId}/questions/${questionId}`);
        const data = await res.json();
        setFormData(data);
        setLoading(false);
      } catch (err) {
        console.error(err || "Error fetching question data");
        setLoading(false);
      }
    };

    if (questionId) fetchQuestion();
  }, [params, questionId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleAnswerChange = (index: number, value: string) => {
    if (!formData) return;
    const updatedAnswers = [...formData.answers];
    updatedAnswers[index] = value;
    setFormData({ ...formData, answers: updatedAnswers });
  };

  const handleAddAnswer = () => {
    if (!formData) return;
    setFormData((prev) => ({
      ...prev!,
      answers: [...prev!.answers, ""],
    }));
  };

  const handleRemoveAnswer = (index: number) => {
    if (!formData) return;
    const updatedAnswers = formData.answers.filter((_, i) => i !== index);
    setFormData({ ...formData, answers: updatedAnswers });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
  
    try {
      const response = await fetch(`/api/host/games/${params.gameId}/rounds/${params.roundId}/questions/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) throw new Error("Failed to update question");
  
      // Redirect to the Questions List Page
      router.push(`/dashboard/host/${params.gameId}/rounds/${params.roundId}/questions`);
    } catch (err) {
        console.error(err || "Error fetching question data");
        //setError(err.message || "Error updating question");
    }
  };
  

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Edit Question</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Question Text:</label>
          <input
            type="text"
            name="text"
            value={formData?.text || ""}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-indigo-300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Type:</label>
          <select
            name="type"
            value={formData?.type || ""}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-indigo-300"
            required
          >
            <option value="" disabled>
              Select Type
            </option>
            <option value="SINGLE">Single Answer</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="MULTI_PART">Multi-Part</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Point Value:</label>
          <input
            type="number"
            name="pointValue"
            value={formData?.pointValue || ""}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Answers:</label>
          <div className="space-y-4">
            {formData?.answers?.length ? (
              formData.answers.map((answer, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAnswer(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No answers available. Add one below!</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddAnswer}
            className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
          >
            Add Answer
          </button>
        </div>
        <div className="text-center">
          <button
            type="submit"
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
