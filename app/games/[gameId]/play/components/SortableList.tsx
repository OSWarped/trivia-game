'use client';

import React, { useEffect, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Option {
  id: string;
  text: string;
}

interface SortableItemProps {
  id: string;
  label: string;
}

function DragHandleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="6" cy="10" r="1.5" />
      <circle cx="6" cy="15" r="1.5" />
      <circle cx="14" cy="5" r="1.5" />
      <circle cx="14" cy="10" r="1.5" />
      <circle cx="14" cy="15" r="1.5" />
    </svg>
  );
}

function SortableItem({ id, label }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    marginBottom: '0.75rem',
    background: isDragging ? '#eff6ff' : '#ffffff',
    borderRadius: '1rem',
    boxShadow: isDragging
      ? '0 10px 24px rgba(15, 23, 42, 0.14)'
      : '0 1px 2px rgba(15, 23, 42, 0.06)',
    border: isDragging ? '1px solid #93c5fd' : '1px solid #e2e8f0',
    opacity: 1,
    color: '#0f172a',
  };

  const handleStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.875rem',
    background: isDragging ? '#dbeafe' : '#f8fafc',
    color: '#475569',
    cursor: isDragging ? 'grabbing' : 'grab',
    flexShrink: 0,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-word',
    color: '#0f172a',
    fontSize: '0.95rem',
    fontWeight: 500,
    lineHeight: 1.4,
  };

  return (
    <div ref={setNodeRef} style={rowStyle}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        style={handleStyle}
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <div style={labelStyle}>{label}</div>
    </div>
  );
}

/**
 * Fisher-Yates shuffle: returns a new array with items randomized
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = array.slice();

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

interface OrderedQuestionProps {
  options: Option[];
  onChange: (newOrder: Option[]) => void;
}

const OrderedQuestion: React.FC<OrderedQuestionProps> = ({
  options,
  onChange,
}) => {
  const [items, setItems] = useState<Option[]>(() => shuffleArray(options));

  useEffect(() => {
    setItems(shuffleArray(options));
  }, [options]);

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    setItems((current) => arrayMove(current, oldIndex, newIndex));
  }

  return (
    <div
      style={{
        width: '100%',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} label={item.text} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default OrderedQuestion;