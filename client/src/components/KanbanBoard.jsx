import React, { useMemo } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { STAGES } from '../utils/stages';
import ScoreBar from './ScoreBar';
import Avatar from './Avatar';
import { formatCompactCurrency, formatRelativeTime } from '../utils/formatters';

export default function KanbanBoard({ rows, stats, onStageChange, onOpen }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGES.map(s => [s.id, []]));
    for (const r of rows) (g[r.stage] || g.new).push(r);
    return g;
  }, [rows]);

  const stageCounts = useMemo(() => {
    const map = Object.fromEntries(STAGES.map(s => [s.id, { count: 0, total_slips: 0 }]));
    for (const s of stats.stages || []) map[s.stage] = { count: s.count, total_slips: s.total_slips };
    return map;
  }, [stats]);

  function onDragEnd(e) {
    const { active, over } = e;
    if (!over) return;
    const targetStage = over.id;
    const r = rows.find(x => x.id === active.id);
    if (r && r.stage !== targetStage) onStageChange(r.id, targetStage);
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-canvas">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 p-4 h-full min-w-max">
          {STAGES.map(s => (
            <Column key={s.id} stage={s} stats={stageCounts[s.id]} rows={grouped[s.id]} onOpen={onOpen} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, rows, stats, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-lg border ${isOver ? 'border-accent bg-accent-subtle' : 'border-hairline bg-surface'}`}
    >
      <div className="px-3 py-2.5 border-b border-hairline flex items-center justify-between sticky top-0 bg-inherit rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="font-semibold text-sm text-ink-1">{stage.label}</span>
          <span className="text-xs text-ink-3 tnum">{stats?.count?.toLocaleString() || 0}</span>
        </div>
        <span className="text-[11px] text-ink-3 tnum" title="Total slips in stage">{stats?.total_slips?.toLocaleString() || 0} slips</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {rows.length === 0 && (
          <div className="text-center text-xs text-ink-4 italic py-6 border border-dashed border-hairline rounded">Empty</div>
        )}
        {rows.map(r => <Card key={r.id} row={r} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function Card({ row, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onOpen(row.id); } }}
      className="p-3 bg-surface border border-hairline rounded-lg shadow-card hover:shadow-pop cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-medium text-sm text-ink-1 truncate">{row.name}</div>
          <div className="text-[11px] text-ink-3 truncate">{[row.city, row.state].filter(Boolean).join(', ')}</div>
        </div>
        <div className="flex-shrink-0">
          <ScoreBar value={row.fit_score} width={48} showNumber />
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-ink-2 tnum">
        <span>{row.slips ?? '—'} slips</span>
        <span>·</span>
        <span>{formatCompactCurrency(row.hotel_market?.adr)} ADR</span>
        {row.hotel_market?.tier && (<><span>·</span><span>Tier {row.hotel_market.tier}</span></>)}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
        <span>{formatRelativeTime(row.last_activity_at)}</span>
        {row.reviewer_email && <Avatar user={{ name: row.reviewer_name, email: row.reviewer_email }} size={18} />}
      </div>
    </div>
  );
}
