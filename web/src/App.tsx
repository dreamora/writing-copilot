import { useEffect, useState } from 'react';

export function App() {
  const [health, setHealth] = useState<string | null>(null);
  const [docPath, setDocPath] = useState('sample.md');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setHealth(data.status))
      .catch(err => setHealth(`error: ${err.message}`));
  }, []);

  // Load document
  const handleLoad = async () => {
    setStatus('Loading...');
    try {
      const res = await fetch(`/api/docs?path=${encodeURIComponent(docPath)}`);
      if (!res.ok) {
        setStatus(`Error: ${res.status}`);
        return;
      }
      const data = await res.json();
      setContent(data.content);
      setStatus(`Loaded: ${data.path} (hash: ${data.hash.substring(0, 8)}...)`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  };

  // Save document
  const handleSave = async () => {
    setStatus('Saving...');
    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: docPath, content })
      });
      if (!res.ok) {
        setStatus(`Error: ${res.status}`);
        return;
      }
      const data = await res.json();
      const backupInfo = data.backupPath ? ` (backup: ${data.backupPath})` : '';
      setStatus(`Saved: ${data.path} (hash: ${data.hash.substring(0, 8)}...)${backupInfo}`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <h1>Writing Copilot — Phase 0</h1>
      
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', borderRadius: '4px' }}>
        <h2>API Status</h2>
        <p>Health: <strong>{health === 'ok' ? '✓ OK' : health || 'checking...'}</strong></p>
      </div>

      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', borderRadius: '4px' }}>
        <h2>Document Editor</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Document path:
            <input
              type="text"
              value={docPath}
              onChange={e => setDocPath(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.5rem', width: '300px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <button onClick={handleLoad} style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }}>
            Load
          </button>
          <button onClick={handleSave} style={{ padding: '0.5rem 1rem' }}>
            Save
          </button>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{
            width: '100%',
            height: '300px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
          placeholder="Document content..."
        />

        <div style={{ marginTop: '1rem', color: '#666' }}>
          <p>{status || 'Ready'}</p>
        </div>
      </div>
    </div>
  );
}
