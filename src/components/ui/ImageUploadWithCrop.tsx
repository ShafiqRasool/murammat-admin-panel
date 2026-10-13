import React, { useRef, useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
interface ImageUploadWithCropProps {
  label: string;
  currentPreview?: string | null;
  onFileReady: (file: File, preview: string) => void;
  onRemove?: () => void;
  required?: boolean;
  /** Max file size in MB before rejecting (default 5 MB) */
  maxMB?: number;
  /** Target output quality 0-1 for JPEG compression (default 0.82) */
  quality?: number;
  /** Max output dimension (width or height, whichever is larger, default 1200px) */
  maxDim?: number;
  disableCompress?: boolean;
  /** Aspect ratio for the crop box (width / height), default 16 / 9 (~1.778) */
  aspectRatio?: number;
}

// ─── Utility: Real crop + resize + compress in browser using Canvas ────────
function cropAndCompressImage(
  img: HTMLImageElement,
  originalFile: File,
  posX: number, // 0 - 100 percent
  posY: number, // 0 - 100 percent
  aspectRatio = 16 / 9,
  quality = 0.82,
  maxDim = 1200,
  disableCompress = false,
): Promise<{ file: File; preview: string }> {
  return new Promise((resolve, reject) => {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    if (!origW || !origH) {
      return reject(new Error('Invalid image dimensions'));
    }

    const imgRatio = origW / origH;
    let cropW = origW;
    let cropH = origH;
    let startX = 0;
    let startY = 0;

    if (imgRatio > aspectRatio) {
      // Image is wider than crop box -> crop left/right
      cropH = origH;
      cropW = origH * aspectRatio;
      const excessX = origW - cropW;
      startX = excessX * (Math.max(0, Math.min(100, posX)) / 100);
      startY = 0;
    } else {
      // Image is taller than crop box -> crop top/bottom
      cropW = origW;
      cropH = origW / aspectRatio;
      const excessY = origH - cropH;
      startX = 0;
      startY = excessY * (Math.max(0, Math.min(100, posY)) / 100);
    }

    // Target dimensions scaled to maxDim if needed
    let targetW = cropW;
    let targetH = cropH;
    if (!disableCompress && (targetW > maxDim || targetH > maxDim)) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetW));
    canvas.height = Math.max(1, Math.round(targetH));
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas context unavailable'));

    const isPng = disableCompress && originalFile.type === 'image/png';
    const outputType = isPng ? 'image/png' : 'image/jpeg';
    const ext = isPng ? '.png' : '.jpg';
    const targetQuality = disableCompress ? 1.0 : quality;

    if (!isPng) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(
      img,
      Math.max(0, Math.round(startX)),
      Math.max(0, Math.round(startY)),
      Math.min(origW - Math.max(0, Math.round(startX)), Math.round(cropW)),
      Math.min(origH - Math.max(0, Math.round(startY)), Math.round(cropH)),
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Crop compression failed'));
        const croppedFile = new File([blob], originalFile.name.replace(/\.[^.]+$/, ext), {
          type: outputType,
          lastModified: Date.now(),
        });
        const previewUrl = canvas.toDataURL(outputType, targetQuality);
        resolve({ file: croppedFile, preview: previewUrl });
      },
      outputType,
      outputType === 'image/jpeg' ? targetQuality : undefined,
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────
const ImageUploadWithCrop: React.FC<ImageUploadWithCropProps> = ({
  label,
  currentPreview,
  onFileReady,
  onRemove,
  required = false,
  maxMB = 5,
  quality = 0.82,
  maxDim = 1200,
  disableCompress = false,
  aspectRatio = 16 / 9,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<string | null>(currentPreview ?? null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus adjustment state (pan percentage 0 - 100)
  const [cropMode, setCropMode] = useState(false);
  const [objPos, setObjPos] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, ox: 50, oy: 50 });

  const rawImgRef = useRef<HTMLImageElement | null>(null);
  const rawFileRef = useRef<File | null>(null);
  const currentPosRef = useRef({ x: 50, y: 50 });

  // Sync when currentPreview changes from outside
  useEffect(() => {
    if (currentPreview !== undefined) {
      setPreview(currentPreview);
      if (!currentPreview) {
        setRawPreview(null);
        rawImgRef.current = null;
        rawFileRef.current = null;
        setCropMode(false);
      }
    }
  }, [currentPreview]);

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: '#878787', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  // Perform canvas crop and emit the real cropped file to parent
  const bakeCrop = useCallback(async (x: number, y: number) => {
    if (!rawImgRef.current || !rawFileRef.current) return;
    try {
      setIsCropping(true);
      const { file: croppedFile, preview: croppedPreview } = await cropAndCompressImage(
        rawImgRef.current,
        rawFileRef.current,
        x,
        y,
        aspectRatio,
        quality,
        maxDim,
        disableCompress,
      );
      setPreview(croppedPreview);
      onFileReady(croppedFile, croppedPreview);
    } catch (err) {
      console.error('Failed to bake crop:', err);
    } finally {
      setIsCropping(false);
    }
  }, [aspectRatio, quality, maxDim, disableCompress, onFileReady]);

  // Handle file select
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

    // Bypass canvas crop for SVG vector graphics
    if (file.type === 'image/svg+xml') {
      setProcessing(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const previewUrl = ev.target!.result as string;
        setPreview(previewUrl);
        setRawPreview(previewUrl);
        rawImgRef.current = null;
        rawFileRef.current = null;
        setCropMode(false);
        onFileReady(file, previewUrl);
        setProcessing(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const srcUrl = ev.target!.result as string;
        const img = new Image();
        img.onload = async () => {
          rawImgRef.current = img;
          rawFileRef.current = file;
          setRawPreview(srcUrl);
          setObjPos({ x: 50, y: 50 });
          currentPosRef.current = { x: 50, y: 50 };

          // Automatically generate initial center-cropped file
          try {
            const { file: croppedFile, preview: croppedPreview } = await cropAndCompressImage(
              img,
              file,
              50,
              50,
              aspectRatio,
              quality,
              maxDim,
              disableCompress,
            );
            setPreview(croppedPreview);
            onFileReady(croppedFile, croppedPreview);
            setCropMode(true); // Open focus adjuster so admin can refine if desired
          } catch (cErr) {
            console.error('Initial crop error:', cErr);
          } finally {
            setProcessing(false);
          }
        };
        img.onerror = () => {
          setError('Failed to load image file.');
          setProcessing(false);
        };
        img.src = srcUrl;
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to process image. Please try another file.');
      setProcessing(false);
    } finally {
      e.target.value = '';
    }
  }, [maxMB, aspectRatio, quality, maxDim, disableCompress, onFileReady]);

  // Mouse & Touch panning for adjusting focus
  const onMouseDown = (e: React.MouseEvent) => {
    if (!cropMode) return;
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, ox: objPos.x, oy: objPos.y });
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !cropMode) return;
    const boxW = containerRef.current?.clientWidth || 360;
    const boxH = containerRef.current?.clientHeight || 200;
    const dx = ((e.clientX - dragStart.mx) / boxW) * 100;
    const dy = ((e.clientY - dragStart.my) / boxH) * 100;
    const newX = Math.max(0, Math.min(100, dragStart.ox - dx));
    const newY = Math.max(0, Math.min(100, dragStart.oy - dy));
    setObjPos({ x: newX, y: newY });
    currentPosRef.current = { x: newX, y: newY };
  }, [dragging, cropMode, dragStart]);

  const onMouseUp = () => {
    if (dragging) {
      setDragging(false);
      // Auto-bake crop with new position on drag release
      bakeCrop(currentPosRef.current.x, currentPosRef.current.y);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!cropMode) return;
    const touch = e.touches[0];
    if (!touch) return;
    setDragging(true);
    setDragStart({ mx: touch.clientX, my: touch.clientY, ox: objPos.x, oy: objPos.y });
  };

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !cropMode) return;
    const touch = e.touches[0];
    if (!touch) return;
    const boxW = containerRef.current?.clientWidth || 360;
    const boxH = containerRef.current?.clientHeight || 200;
    const dx = ((touch.clientX - dragStart.mx) / boxW) * 100;
    const dy = ((touch.clientY - dragStart.my) / boxH) * 100;
    const newX = Math.max(0, Math.min(100, dragStart.ox - dx));
    const newY = Math.max(0, Math.min(100, dragStart.oy - dy));
    setObjPos({ x: newX, y: newY });
    currentPosRef.current = { x: newX, y: newY };
  }, [dragging, cropMode, dragStart]);

  // Done Adjusting button action
  const handleDoneAdjusting = async () => {
    if (rawImgRef.current && rawFileRef.current) {
      await bakeCrop(currentPosRef.current.x, currentPosRef.current.y);
    }
    setCropMode(false);
  };

  // Adjust Focus button action (re-opens raw view for re-pan)
  const handleStartAdjusting = () => {
    if (!rawImgRef.current && preview) {
      // If image was loaded from URL, try loading into Image element to allow crop
      setProcessing(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        rawImgRef.current = img;
        fetch(preview)
          .then(r => r.blob())
          .then(blob => {
            rawFileRef.current = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
            setRawPreview(preview);
            setCropMode(true);
            setProcessing(false);
          })
          .catch(() => {
            setProcessing(false);
            setCropMode(true);
          });
      };
      img.onerror = () => {
        setProcessing(false);
        setError('To adjust focus for this existing image, please click Replace Image to upload it.');
      };
      img.src = preview;
      return;
    }
    setCropMode(true);
  };

  const handleRemove = () => {
    setPreview(null);
    setRawPreview(null);
    rawImgRef.current = null;
    rawFileRef.current = null;
    setCropMode(false);
    onRemove?.();
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>

      {/* Preview + Real Crop viewport */}
      {preview && (
        <div style={{ marginBottom: '10px' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: `${aspectRatio}`,
              maxHeight: '220px',
              borderRadius: '12px',
              border: cropMode ? '2px dashed #00674F' : '1.5px solid #d1e8f5',
              overflow: 'hidden',
              background: '#f0f7fd',
              cursor: cropMode ? (dragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none',
              touchAction: cropMode ? 'none' : 'auto',
            }}
            onMouseDown={cropMode ? onMouseDown : undefined}
            onMouseMove={cropMode ? onMouseMove : undefined}
            onMouseUp={cropMode ? onMouseUp : undefined}
            onMouseLeave={cropMode ? onMouseUp : undefined}
            onTouchStart={cropMode ? onTouchStart : undefined}
            onTouchMove={cropMode ? onTouchMove : undefined}
            onTouchEnd={cropMode ? onMouseUp : undefined}
          >
            <img
              src={(cropMode ? rawPreview : preview) || preview || ''}
              alt="Preview"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: cropMode ? `${objPos.x}% ${objPos.y}%` : 'center',
                transition: dragging ? 'none' : 'object-position 0.15s',
                pointerEvents: 'none',
              }}
            />
            {cropMode && (
              <div style={{
                position: 'absolute', bottom: '8px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.72)', color: '#fff',
                fontSize: '11px', fontWeight: 500, borderRadius: '20px',
                padding: '4px 14px', pointerEvents: 'none',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                <span>🖱 Drag to adjust focus</span>
                {isCropping && <span style={{ opacity: 0.8 }}>(cropping…)</span>}
              </div>
            )}
          </div>

          {/* Controls: Done adjusting & Remove */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={cropMode ? handleDoneAdjusting : handleStartAdjusting}
              style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', border: 'none',
                background: cropMode ? '#00674F' : '#e6f3ee',
                color: cropMode ? '#fff' : '#00674F',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {cropMode ? '✓ Done Adjusting' : '✂ Adjust Focus'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
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
          padding: '9px 16px', border: '1.5px dashed #00674F',
          borderRadius: '10px', background: '#f0fdf7', color: '#00674F',
          fontSize: '13px', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer',
          opacity: processing ? 0.6 : 1, transition: 'all 0.15s',
        }}
      >
        {processing ? (
          <>
            <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid #00674F', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
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
        JPEG/PNG/WebP/SVG · Max {maxMB} MB · Auto-cropped to match service cards
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
