'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

export type RoundType =
  | 'POINT_BASED'
  | 'TIME_BASED'
  | 'WAGER'
  | 'LIGHTNING'
  | 'IMAGE';

export type PointSystem = 'FLAT' | 'POOL';

export interface RoundConfig {
  name: string;
  roundType: RoundType;
  pointSystem?: PointSystem;
  pointValue?: number;
  pointPool?: number[];
}

interface AddRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RoundConfig) => void;
}

export default function AddRoundModal({
  isOpen,
  onClose,
  onSave,
}: AddRoundModalProps) {
  const [name, setName] = useState('');
  const [roundType, setRoundType] = useState<RoundType>('POINT_BASED');
  const [pointSystem, setPointSystem] = useState<PointSystem>('FLAT');
  const [pointValue, setPointValue] = useState<number>(1);
  const [poolInput, setPoolInput] = useState<string>('');
  const [pointPool, setPointPool] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (roundType !== 'POINT_BASED') {
      setPointSystem('FLAT');
      setPointValue(1);
      setPointPool([]);
    }
  }, [roundType]);

  function addPoolNumber() {
    const num = parseInt(poolInput, 10);
    if (!Number.isNaN(num) && num > 0 && !pointPool.includes(num)) {
      setPointPool([...pointPool, num].sort((a, b) => a - b));
    }
    setPoolInput('');
  }

  function removePoolNumber(n: number) {
    setPointPool(pointPool.filter((x) => x !== n));
  }

  function resetForm() {
    setName('');
    setRoundType('POINT_BASED');
    setPointSystem('FLAT');
    setPointValue(1);
    setPoolInput('');
    setPointPool([]);
    setErrors([]);
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required.');

    if (roundType === 'POINT_BASED') {
      if (pointSystem === 'FLAT') {
        if (!pointValue || pointValue < 1) {
          errs.push('Flat points must be 1 or greater.');
        }
      } else if (pointSystem === 'POOL') {
        if (pointPool.length === 0) {
          errs.push('Pool must contain at least one number.');
        }
      }
    }

    setErrors(errs);
    return errs.length === 0;
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSave() {
    if (!validate()) return;

    const config: RoundConfig = { name: name.trim(), roundType };

    if (roundType === 'POINT_BASED') {
      config.pointSystem = pointSystem;

      if (pointSystem === 'FLAT') {
        config.pointValue = pointValue;
      } else {
        config.pointPool = pointPool;
      }
    }

    onSave(config);
    resetForm();
    onClose();
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto px-4">
          <div className="flex min-h-full items-center justify-center py-6 text-left">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-xl font-semibold text-slate-900">
                    Add New Round
                  </Dialog.Title>

                  <button
                    onClick={handleClose}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {errors.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="space-y-1">
                      {errors.map((e, i) => (
                        <div key={i}>• {e}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Round Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter round name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Round Type
                    </label>
                    <select
                      value={roundType}
                      onChange={(e) => setRoundType(e.target.value as RoundType)}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="POINT_BASED">Point-based</option>
                      <option value="TIME_BASED">Time-based</option>
                      <option value="WAGER">Wager</option>
                      <option value="LIGHTNING">Lightning</option>
                      <option value="IMAGE">Image</option>
                    </select>
                  </div>

                  {roundType === 'POINT_BASED' && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Point System
                        </label>

                        <div className="flex flex-wrap gap-4">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="pointSystem"
                              value="FLAT"
                              checked={pointSystem === 'FLAT'}
                              onChange={() => setPointSystem('FLAT')}
                              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                            />
                            <span>Flat</span>
                          </label>

                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="pointSystem"
                              value="POOL"
                              checked={pointSystem === 'POOL'}
                              onChange={() => setPointSystem('POOL')}
                              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                            />
                            <span>Pool</span>
                          </label>
                        </div>
                      </div>

                      {pointSystem === 'FLAT' && (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Points per question
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={pointValue}
                            onChange={(e) =>
                              setPointValue(parseInt(e.target.value, 10) || 0)
                            }
                            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {pointSystem === 'POOL' && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-slate-700">
                            Define pool numbers
                          </label>

                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              value={poolInput}
                              onChange={(e) => setPoolInput(e.target.value)}
                              className="block w-32 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="10"
                            />
                            <button
                              type="button"
                              onClick={addPoolNumber}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                            >
                              Add
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {pointPool.map((n) => (
                              <div
                                key={n}
                                className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                              >
                                <span>{n}</span>
                                <button
                                  type="button"
                                  onClick={() => removePoolNumber(n)}
                                  className="ml-2 text-rose-500 transition hover:text-rose-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Save Round
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}