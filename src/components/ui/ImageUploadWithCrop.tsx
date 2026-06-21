import React, { useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
interface ImageUploadWithCropProps {
  label: string;
  currentPreview?: string | null;
  onFileReady: (file: File, preview: string) => void;
  required?: boolean;
  /** Max file size in MB before rejecting (default 5 MB) */
  maxMB?: number;
  /** Target output quality 0-1 for JPEG compression (default 0.82) */
  quality?: number;
  /** Max output dimension (width or height, whichever is larger, default 1200px) */
  maxDim?: number;
  disableCompress?: boolean;
}

// ─── Utility: compress + resize image in browser using Canvas ─────────────
function compressImage(
  file: File,
  quality = 0.82,
  maxDim = 1200,
  disableCompress = false,
): Promise<{ file: File; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const targetDim = disableCompress ? Math.max(width, height) : maxDim;
        const targetQuality = disableCompress ? 1.0 : quality;

        // Resize if needed
        if (!disableCompress && (width > targetDim || height > targetDim)) {
          if (width >= height) {
            height = Math.round((height * targetDim) / width);
            width = targetDim;
          } else {
            width = Math.round((width * targetDim) / height);
            height = targetDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Fill with white to prevent black background for transparent PNG/WebP images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = (disableCompress && file.type === 'image/png') ? 'image/png' : 'image/jpeg';
        const ext = outputType === 'image/png' ? '.png' : '.jpg';

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ext), {
              type: outputType,
              lastModified: Date.now(),
            });
            const preview = canvas.toDataURL(outputType, targetQuality);
            resolve({ file: compressedFile, preview });
          },
          outputType,
          outputType === 'image/jpeg' ? targetQuality : undefined,
        );
      };
      img.onerror = reject;
      img.src = ev.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────
const ImageUploadWithCrop: React.FC<ImageUploadWithCropProps> = ({
  label,
  currentPreview,
  onFileReady,
  required = false,
  maxMB = 5,
  quality = 0.82,
  maxDim = 1200,
  disableCompress = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPreview ?? null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Crop state (simple pan via object-position)
  const [cropMode, setCropMode] = useState(false);
  const [objPos, setObjPos] = useState({ x: 50, y: 50 }); // percent
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, ox: 50, oy: 50 });

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: '#878787', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Size check
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Image must be smaller than ${maxMB} MB.`);
      e.target.value = '';
      return;
    }
    // Type check
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed (JPEG, PNG, WebP, SVG).');
      e.target.value = '';
      return;
    }

    // Bypass canvas compression for SVG vector graphics
    if (file.type === 'image/svg+xml') {
      setProcessing(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const previewUrl = ev.target!.result as string;
        setPreview(previewUrl);
        setCropMode(false); // No crop adjustment for SVGs
        onFileReady(file, previewUrl);
        setProcessing(false);
      };
      reader.onerror = () => {
        setError('Failed to process SVG image.');
        setProcessing(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    setProcessing(true);
    try {
      const { file: compressed, preview: prev } = await compressImage(file, quality, maxDim, disableCompress);
      setPreview(prev);
      setObjPos({ x: 50, y: 50 });
      setCropMode(true);
      onFileReady(compressed, prev);
    } catch {
      setError('Failed to process image. Please try another file.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  }, [maxMB, quality, maxDim, disableCompress, onFileReady]);

  // Mouse-based panning for crop adjustment
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, ox: objPos.x, oy: objPos.y });
  };
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = ((e.clientX - dragStart.mx) / 200) * 100;
    const dy = ((e.clientY - dragStart.my) / 200) * 100;
    setObjPos({
      x: Math.max(0, Math.min(100, dragStart.ox - dx)),
      y: Math.max(0, Math.min(100, dragStart.oy - dy)),
    });
  }, [dragging, dragStart]);
  const onMouseUp = () => setDragging(false);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>

      {/* Preview + Crop area */}
      {preview && (
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              borderRadius: '12px',
              border: '1.5px solid #d1e8f5',
              overflow: 'hidden',
              background: '#f0f7fd',
              cursor: cropMode ? (dragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none',
            }}
            onMouseDown={cropMode ? onMouseDown : undefined}
            onMouseMove={cropMode ? onMouseMove : undefined}
            onMouseUp={cropMode ? onMouseUp : undefined}
            onMouseLeave={cropMode ? onMouseUp : undefined}
          >
            <img
              src={preview}
              alt="Preview"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${objPos.x}% ${objPos.y}%`,
                transition: dragging ? 'none' : 'object-position 0.15s',
                pointerEvents: 'none',
              }}
            />
            {cropMode && (
              <div style={{
                position: 'absolute', bottom: '8px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: '11px', borderRadius: '20px',
                padding: '4px 12px', pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>
                🖱 Drag to adjust focus
              </div>
            )}
          </div>

          {/* Crop toggle & reset row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setCropMode(m => !m)}
              style={{
                padding: '5px 14px', borderRadius: '8px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', border: 'none',
                background: cropMode ? '#2B9FD8' : '#e8f4fb',
                color: cropMode ? '#fff' : '#2B9FD8',
                transition: 'all 0.15s',
              }}
            >
              {cropMode ? '✓ Done Adjusting' : '✂ Adjust Focus'}
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setCropMode(false); }}
              style={{
                padding: '5px 14px', borderRadius: '8px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer',
                border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626',
              }}
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={processing}
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 16px', border: '1.5px dashed #2B9FD8',
          borderRadius: '10px', background: '#f0f7fd', color: '#2B9FD8',
          fontSize: '13px', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer',
          opacity: processing ? 0.6 : 1, transition: 'all 0.15s',
        }}
      >
        {processing ? (
          <>
            <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid #2B9FD8', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            Processing…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            {preview ? 'Replace Image' : 'Upload Image'}
          </>
        )}
      </button>

      {/* Size hint */}
      <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#5a7a9a' }}>
        JPEG/PNG/WebP/SVG · Max {maxMB} MB · Auto-compressed &amp; resized (except SVG)
      </p>

      {/* Error */}
      {error && (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploadWithCrop;
