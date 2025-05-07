/* eslint-disable @typescript-eslint/no-unused-expressions */
'use client';

import React, { useState, useEffect } from 'react';

export type QuestionType = 'SINGLE' | 'LIST' | 'MULTIPLE_CHOICE' | 'ORDERED' | 'WAGER';

export type QuestionConfig = {
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswers?: string[];
};

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: QuestionConfig, idToUpdate?: string) => void;
  question?: QuestionConfig & { id: string }; // 🆕
}

export default function AddQuestionModal({
  isOpen,
  onClose,
  onSave,
  question,
}: AddQuestionModalProps) {
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('SINGLE');

  const [singleAnswer, setSingleAnswer] = useState('');

  const [optionInput, setOptionInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctSet, setCorrectSet] = useState<Set<string>>(new Set());

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (question) {
      // Always clear everything first
      setText('');
      setType('SINGLE');
      setSingleAnswer('');
      setOptionInput('');
      setOptions([]);
      setCorrectSet(new Set());
      setErrors([]);
  
      // Now set new values
      setText(question.text);
      setType(question.type);
  
      if (question.type === 'SINGLE') {
        setSingleAnswer(question.correctAnswers?.[0] ?? '');
      } else {
        setOptions(question.options ?? []);
        setCorrectSet(new Set(question.correctAnswers ?? []));
      }
    }
  }, [question]);
  function resetForm() {
    setText('');
    setType('SINGLE');
    setSingleAnswer('');
    setOptionInput('');
    setOptions([]);
    setCorrectSet(new Set());
    setErrors([]);
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!text.trim()) errs.push('Question text is required.');

    if (type === 'SINGLE') {
      if (!singleAnswer.trim()) errs.push('Correct answer is required.');
    }

    if (type === 'MULTIPLE_CHOICE' || type === 'LIST' || type === 'ORDERED') {
      if (options.length === 0) errs.push('At least one option is required.');
      if (correctSet.size === 0) errs.push('At least one correct option must be selected.');
      if (type === 'ORDERED' && correctSet.size !== options.length) {
        errs.push('For ordered questions, all options must be marked correct (in order).');
      }
    }

    setErrors(errs);
    return errs.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
  
    const config: QuestionConfig = {
      text: text.trim(),
      type,
    };
  
    if (type === 'SINGLE') {
      config.options = [singleAnswer.trim()];
      config.correctAnswers = [singleAnswer.trim()];
    }
  
    if (type === 'MULTIPLE_CHOICE' || type === 'LIST' || type === 'ORDERED') {
      config.options = [...options];
      config.correctAnswers = Array.from(correctSet);
    }
  
    onSave(config, question?.id); // 🆕 pass ID if editing
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-lg rounded shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            {question ? 'Edit Question' : 'Add Question'}
          </h3>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 space-y-1 text-red-600">
            {errors.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {/* Question Text */}
          <div>
            <label className="block font-medium mb-1">Question Text</label>
            <textarea
              className="w-full border border-gray-300 rounded p-2"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Question Type */}
          <div>
            <label className="block font-medium mb-1">Type</label>
            <select
              className="w-full border border-gray-300 rounded p-2"
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              <option value="SINGLE">Single Answer</option>
              <option value="LIST">List</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="ORDERED">Ordered List</option>
              <option value="WAGER">Wager</option>
            </select>
          </div>

          {/* SINGLE: Answer */}
          {type === 'SINGLE' && (
            <div>
              <label className="block font-medium mb-1">Correct Answer</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                value={singleAnswer}
                onChange={(e) => setSingleAnswer(e.target.value)}
              />
            </div>
          )}

          {/* MULTIPLE_CHOICE or ORDERED: Options */}
          {(type === 'MULTIPLE_CHOICE' || type === 'LIST' || type === 'ORDERED') && (
            <div className="space-y-2">
              <label className="block font-medium">Options</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded p-2"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-blue-500 text-white px-3 rounded"
                  onClick={() => {
                    const val = optionInput.trim();
                    if (val && !options.includes(val)) {
                      setOptions((o) => [...o, val]);
                      setOptionInput('');
                    }
                  }}
                >
                  Add
                </button>
              </div>

              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {options.map((opt) => (
                  <li key={opt} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={correctSet.has(opt)}
                      onChange={() => {
                        setCorrectSet((prev) => {
                          const updated = new Set(prev);
                          updated.has(opt) ? updated.delete(opt) : updated.add(opt);
                          return updated;
                        });
                      }}
                    />
                    <span className="flex-1">{opt}</span>
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => {
                        setOptions((prev) => prev.filter((x) => x !== opt));
                        setCorrectSet((prev) => {
                          const updated = new Set(prev);
                          updated.delete(opt);
                          return updated;
                        });
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* WAGER: Placeholder */}
          {type === 'WAGER' && (
            <div className="text-sm text-gray-600">
              Wager-type questions typically let teams wager points. No answer needed here.
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {question ? 'Save Changes' : 'Save Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
