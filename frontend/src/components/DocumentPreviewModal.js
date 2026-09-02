import React, { useEffect, useState } from 'react';

// Reusable document preview modal with blob-fetch fallback, Escape-to-close and body-scroll lock
export default function DocumentPreviewModal({ open, url, title = 'Document', onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !url) return undefined;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchBlob() {
      setLoading(true);
      try {
        // try to fetch the document as a blob (same-origin or CORS-enabled)
        const res = await fetch(url, { signal: controller.signal, credentials: 'include' });
        if (!res.ok) return; // fallback to using the original URL
        const blob = await res.blob();
        if (cancelled) return;
        const obj = URL.createObjectURL(blob);
        setBlobUrl(obj);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Document preview fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlob();

    return () => {
      cancelled = true;
      controller.abort();
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
        setBlobUrl(null);
      }
    };
    // only run when open/url changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url]);

  useEffect(() => {
    if (!open) return undefined;
    // lock background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev || '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const src = blobUrl || url;

  return (
    <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: 1000, height: '90%', maxHeight: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* <a className="wc-btn wc-btn-outline" href={url} target="_blank" rel="noreferrer">Open in new tab</a> */}
            <button className="wc-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ height: 'calc(100% - 48px)', display: 'flex', flexDirection: 'column' }}>
          {loading && <div style={{ padding: 12, color: '#64748b' }}>Preparing preview…</div>}
          <iframe src={src} title="Document preview" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      </div>
    </div>
  );
}
