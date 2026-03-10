/* eslint-disable @typescript-eslint/no-unused-expressions */
'use client';

import React, { useState, useEffect } from 'react';

export type QuestionType =
  | 'SINGLE'
  | 'LIST'
  | 'MULTIPLE_CHOICE'
  | 'ORDERED'
  | 'WAGER';

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
  question?: QuestionConfig & { id: string };
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
      setText('');
      setType('SINGLE');
      setSingleAnswer('');
      setOptionInput('');
      setOptions([]);
      setCorrectSet(new Set());
      setErrors([]);

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

    onSave(config, question?.id);
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            {question ? 'Edit Question' : 'Add Question'}
          </h3>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-2xl leading-none text-slate-400 transition hover:text-slate-700"
          >
            &times;
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="space-y-1">
              {errors.map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Question Text
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the question text"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {type === 'SINGLE' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Correct Answer
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={singleAnswer}
                onChange={(e) => setSingleAnswer(e.target.value)}
                placeholder="Enter the correct answer"
              />
            </div>
          )}

          {(type === 'MULTIPLE_CHOICE' || type === 'LIST' || type === 'ORDERED') && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Options
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  placeholder="Add an option"
                />
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
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

              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {options.map((opt) => (
                  <li
                    key={opt}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
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
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <span className="flex-1 text-sm text-slate-800">{opt}</span>
                    <button
                      type="button"
                      className="text-lg leading-none text-rose-500 transition hover:text-rose-700"
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

          {type === 'WAGER' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Wager-type questions typically let teams wager points. No answer is needed here.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {question ? 'Save Changes' : 'Save Question'}
          </button>
        </div>
      </div>
    </div>
  );
}