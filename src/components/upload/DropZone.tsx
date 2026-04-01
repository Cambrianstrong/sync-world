'use client';

import { useState, useRef } from 'react';

interface DropZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function DropZone({ files, onFilesChange }: DropZoneProps) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragover(false);
    const newFiles = Array.from(e.dataTransfer.files);
    onFilesChange([...files, ...newFiles]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      onFilesChange([...files, ...Array.from(e.target.files)]);
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragover ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 20,
          cursor: 'pointer', transition: 'all 0.2s',
          background: dragover ? 'var(--glow)' : 'transparent',
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Drop audio files here or click to browse</h3>
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>
          AIFF or WAV preferred (hi-res) &mdash; MP3 accepted. Mains, Cleans, Instrumentals, Acapellas.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleSelect}
        />
      </div>

      {files.length > 0 && (
        <ul style={{ listStyle: 'none', marginBottom: 20 }}>
          {files.map((f, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, marginBottom: 8, fontSize: 13,
            }}>
              <span style={{ fontWeight: 500 }}>{f.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--dim)', fontSize: 12 }}>
                  {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    color: 'var(--red)', cursor: 'pointer', background: 'none', border: 'none',
                    fontSize: 16, lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
