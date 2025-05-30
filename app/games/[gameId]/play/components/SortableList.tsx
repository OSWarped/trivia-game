'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Option {
  id: string
  text: string
}

interface SortableItemProps {
  id: string
  label: string
}

function SortableItem({ id, label }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '0.5rem 1rem',
    marginBottom: '0.5rem',
    background: 'white',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    cursor: 'grab',
    border: '1px solid #e2e8f0',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {label}
    </div>
  )
}

/**
 * Fisher-Yates shuffle: returns a new array with items randomized
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = array.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

interface OrderedQuestionProps {
  options: Option[]
  onChange: (newOrder: Option[]) => void
}

const OrderedQuestion: React.FC<OrderedQuestionProps> = ({ options, onChange }) => {
  // 1. shuffle once per options change
  const shuffledOptions = useMemo(() => shuffleArray(options), [options]);

  // 2. local DnD list state
  const [items, setItems] = useState<Option[]>(shuffledOptions);

  // Initialize and shuffle once when options change
  useEffect(() => {
    setItems(shuffledOptions);
    onChange(shuffledOptions);          // notify parent once
  }, [shuffledOptions]);   

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)
      onChange(newItems)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map(item => (
          <SortableItem key={item.id} id={item.id} label={item.text} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

export default OrderedQuestion
