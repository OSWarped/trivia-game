'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

export type RoundType = 'POINT_BASED' | 'TIME_BASED' | 'WAGER' | 'LIGHTNING' | 'IMAGE';
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

export default function AddRoundModal({ isOpen, onClose, onSave }: AddRoundModalProps) {
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
    if (!isNaN(num) && num > 0 && !pointPool.includes(num)) {
      setPointPool([...pointPool, num].sort((a, b) => a - b));
    }
    setPoolInput('');
  }

  function removePoolNumber(n: number) {
    setPointPool(pointPool.filter(x => x !== n));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required');
    if (roundType === 'POINT_BASED') {
      if (pointSystem === 'FLAT') {
        if (!pointValue || pointValue < 1) errs.push('Flat points must be ≥ 1');
      } else if (pointSystem === 'POOL') {
        if (pointPool.length === 0) errs.push('Pool must have at least one number');
      }
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const config: RoundConfig = { name, roundType };
    if (roundType === 'POINT_BASED') {
      config.pointSystem = pointSystem;
      if (pointSystem === 'FLAT') {
        config.pointValue = pointValue;
      } else {
        config.pointPool = pointPool;
      }
    }
    onSave(config);
    // Reset form
    setName('');
    setRoundType('POINT_BASED');
    setPointSystem('FLAT');
    setPointValue(1);
    setPointPool([]);
    onClose();
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Add New Round</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {errors.length > 0 && (
                    <div className="space-y-1 text-red-600">
                      {errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Round Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-1 block w-full rounded border-gray-300 p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Round Type</label>
                    <select
                      value={roundType}
                      onChange={e => setRoundType(e.target.value as RoundType)}
                      className="mt-1 block w-full rounded border-gray-300 p-2"
                    >
                      <option value="POINT_BASED">Point-based</option>
                      <option value="TIME_BASED">Time-based</option>
                      <option value="WAGER">Wager</option>
                      <option value="LIGHTNING">Lightning</option>
                      <option value="IMAGE">Image</option>
                    </select>
                  </div>

                  {roundType === 'POINT_BASED' && (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">Point System</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="pointSystem"
                            value="FLAT"
                            checked={pointSystem === 'FLAT'}
                            onChange={() => setPointSystem('FLAT')}
                          />
                          <span>Flat</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="pointSystem"
                            value="POOL"
                            checked={pointSystem === 'POOL'}
                            onChange={() => setPointSystem('POOL')}
                          />
                          <span>Pool</span>
                        </label>
                      </div>

                      {pointSystem === 'FLAT' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Points per question</label>
                          <input
                            type="number"
                            min={1}
                            value={pointValue}
                            onChange={e => setPointValue(parseInt(e.target.value, 10))}
                            className="mt-1 block w-full rounded border-gray-300 p-2"
                          />
                        </div>
                      )}

                      {pointSystem === 'POOL' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Define pool numbers</label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              min={1}
                              value={poolInput}
                              onChange={e => setPoolInput(e.target.value)}
                              className="block w-1/3 rounded border-gray-300 p-2"
                            />
                            <button
                              type="button"
                              onClick={addPoolNumber}
                              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pointPool.map(n => (
                              <div key={n} className="flex items-center bg-gray-200 px-2 py-1 rounded">
                                <span>{n}</span>
                                <button
                                  onClick={() => removePoolNumber(n)}
                                  className="ml-2 text-red-600"
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

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Save Round →
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
