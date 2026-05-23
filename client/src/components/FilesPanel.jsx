import React, { useCallback, useEffect, useRef, useState } from 'react';
import { listFiles, uploadFile, deleteFile, downloadFileUrl } from '../utils/api';
import { formatRelativeTime } from '../utils/formatters';

const FILE_TYPES = [
  { id: 'om',        label: 'OM' },
  { id: 'financial', label: 'Financials' },
  { id: 'survey',    label: 'Survey' },
  { id: 'photo',     label: 'Photo' },
  { id: 'contract',  label: 'Contract' },
  { id: 'other',     label: 'Other' }
];

const TYPE_TINTS = {
  om:        { bg: '#FEF3C7', fg: '#92400E' },
  financial: { bg: '#D1FAE5', fg: '#065F46' },
  survey:    { bg: '#E0E7FF', fg: '#3730A3' },
  photo:     { bg: '#FCE7F3', fg: '#9D174D' },
  contract:  { bg: '#CFFAFE', fg: '#155E75' },
  other:     { bg: '#F1F3F7', fg: '#475569' }
};

export default function FilesPanel({ marinaId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [stagedType, setStagedType] = useState('other');
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFiles(marinaId);
      setFiles(r.files || []);
    } catch (e) { setError(e.body?.error || e.message); }
    finally { setLoading(false); }
  }, [marinaId]);

  useEffect(() => { if (marinaId) refresh(); }, [marinaId, refresh]);

  const onFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const f of fileList) {
        await uploadFile(marinaId, f, stagedType);
      }
      await refresh();
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setUploading(false);
    }
  }, [marinaId, stagedType, refresh]);

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  }

  async function remove(id) {
    if (!window.confirm('Delete this file?')) return;
    try {
      await deleteFile(id);
      await refresh();
    } catch (e) { setError(e.body?.error || e.message); }
  }

  return (
    <div className="border border-hairline rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-hairline">
        <div>
          <h3 className="font-semibold text-ink-1">Files</h3>
          <p className="text-xs text-ink-3 mt-0.5">{files.length} attached</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stagedType}
            onChange={(e) => setStagedType(e.target.value)}
            className="text-xs px-2 py-1.5 bg-canvas border border-hairline rounded"
            title="Tag the next upload"
          >
            {FILE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      {error && <div className="px-4 py-2 text-xs bg-red-50 text-red-700 border-b border-red-100">{error}</div>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`px-4 py-3 ${dragging ? 'bg-accent-subtle ring-2 ring-accent-ring ring-inset' : ''}`}
      >
        {loading ? (
          <div className="py-4 text-center text-sm text-ink-3">Loading…</div>
        ) : files.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-3 border border-dashed border-hairline rounded-lg">
            Drag files here or click <span className="font-medium">Upload</span>.
            <div className="text-[11px] text-ink-4 mt-1">OMs, financials, surveys, photos, contracts — up to 50 MB each.</div>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {files.map(f => (
              <li key={f.id} className="py-2.5 flex items-center gap-3">
                <FileIcon contentType={f.content_type} />
                <div className="min-w-0 flex-1">
                  <a
                    href={downloadFileUrl(f.id)}
                    target="_blank" rel="noreferrer"
                    className="block text-sm font-medium text-ink-1 hover:text-accent truncate"
                    title={f.filename}
                  >{f.filename}</a>
                  <div className="text-[11px] text-ink-3 truncate">
                    {formatBytes(f.size_bytes)} · {formatRelativeTime(f.uploaded_at)}
                  </div>
                </div>
                <TypeChip type={f.file_type} />
                <button
                  onClick={() => remove(f.id)}
                  className="text-ink-3 hover:text-red-600 text-lg leading-none px-1"
                  title="Delete"
                  aria-label="Delete"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TypeChip({ type }) {
  const t = TYPE_TINTS[type] || TYPE_TINTS.other;
  const label = FILE_TYPES.find(x => x.id === type)?.label || 'Other';
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: t.bg, color: t.fg }}>
      {label}
    </span>
  );
}

function FileIcon({ contentType }) {
  const isImage = /^image\//.test(contentType || '');
  const isPdf   = /pdf/i.test(contentType || '');
  const isSheet = /(sheet|excel|csv)/i.test(contentType || '');
  const color =
    isImage ? '#EC4899' :
    isPdf   ? '#DC2626' :
    isSheet ? '#10B981' :
              '#64748B';
  return (
    <div className="w-8 h-9 flex-shrink-0 rounded grid place-items-center text-[9px] font-bold text-white" style={{ background: color }}>
      {isImage ? 'IMG' : isPdf ? 'PDF' : isSheet ? 'XLS' : 'FILE'}
    </div>
  );
}

function formatBytes(b) {
  if (!b && b !== 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
