import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import QRCode from 'qrcode';

// Use the locally bundled worker via Vite ?url import strategy
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// --- QR Watermark Utility ---
// Generates a QR code Data URL pointing to secureprintout.in
let cachedQrDataUrl = null;
async function getQrWatermark() {
  if (cachedQrDataUrl) return cachedQrDataUrl;
  cachedQrDataUrl = await QRCode.toDataURL('https://secureprintout.in', {
    width: 100,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });
  return cachedQrDataUrl;
}

// Loads a Data URL into an HTMLImageElement (for ctx.drawImage)
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Applies QR watermark + text to bottom-right of a canvas context
async function applyQrWatermark(canvas, context) {
  const qrDataUrl = await getQrWatermark();
  const qrImg = await loadImage(qrDataUrl);

  // Reduce QR size by ~30% from the original 100px
  const qrSize = Math.round(100 * 0.7); // 70px
  const padding = 20;
  const qrX = canvas.width - qrSize - padding;
  const qrY = canvas.height - qrSize - padding - 20; // 20px extra room for text below

  // Set subtle watermark opacity before drawing
  context.globalAlpha = 0.3;

  // Draw QR code in the bottom-right corner
  context.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Draw text label directly below the QR code
  context.font = "11px 'Inter', 'Segoe UI', sans-serif";
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.textAlign = "center";
  context.fillText(
    "Securely Printed via secureprintout.in",
    qrX + qrSize / 2,
    qrY + qrSize + 14
  );

  // Reset opacity so subsequent PDF pages are not affected
  context.globalAlpha = 1.0;
}


export default function DocumentViewer({ payload, onPrintComplete }) {
  const [pages, setPages] = useState([]); // Store rendering DataURLs in state 
  const [rendering, setRendering] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  // 1. Core Sequential Rendering Engine — Multi-File Support
  useEffect(() => {
    let unmounted = false;

    const renderAllFiles = async () => {
      try {
        // Support both new multi-file payload and legacy single-file payload
        const fileArray = payload.files
          ? payload.files
          : (payload.fileBase64 ? [{ fileBase64: payload.fileBase64, mimeType: payload.mimeType }] : []);

        if (fileArray.length === 0) return;
        setRendering(true);

        // Count total pages across all files for progress (estimate 1 page per file initially)
        const totalFiles = fileArray.length;
        const generatedDataUrls = [];

        // Temporary invisible Canvas for sequential rendering queue
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });

        // --- SEQUENTIAL FILE PROCESSING (Mandate: No parallel to avoid OOM) ---
        for (let fileIdx = 0; fileIdx < totalFiles; fileIdx++) {
          if (unmounted) return;

          const currentFile = fileArray[fileIdx];
          setProgress({ current: fileIdx + 1, total: totalFiles, label: `Processing file ${fileIdx + 1} of ${totalFiles}...` });

          // Branch by MimeType
          if (currentFile.mimeType === 'application/pdf') {
            // Use native fetch to safely parse massive Base64 strings into an ArrayBuffer
            const res = await fetch(`data:application/pdf;base64,${currentFile.fileBase64}`);
            const arrayBuffer = await res.arrayBuffer();
            const pdfData = new Uint8Array(arrayBuffer);

            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdfFrame = await loadingTask.promise;

            const totalPages = pdfFrame.numPages;

            // Ensure Sequential Await Loop per specifications (No Promise.all)
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              if (unmounted) return;

              setProgress({
                current: fileIdx + 1,
                total: totalFiles,
                label: `File ${fileIdx + 1}/${totalFiles} — Page ${pageNum}/${totalPages}`
              });

              const page = await pdfFrame.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 }); // Hi-Res

              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: context, viewport }).promise;

              // Apply QR watermark to bottom-right corner
              await applyQrWatermark(canvas, context);

              // Extract serialized image data
              generatedDataUrls.push(canvas.toDataURL('image/jpeg', 0.8));

              // Explicitly clear buffer to keep RAM usage low
              context.clearRect(0, 0, canvas.width, canvas.height);
            }

            // Destroy PDF instance to free memory before next file (MANDATORY)
            await pdfFrame.destroy();

          } else if (currentFile.mimeType.startsWith('image/')) {
            // --- Dedicated Image Rendering Pipeline ---
            // Use a data URI so the browser knows the true intrinsic size.
            const imgSrc = `data:${currentFile.mimeType};base64,${currentFile.fileBase64}`;
            const img = await loadImage(imgSrc);

            // Create a fresh, dedicated canvas for this image (do NOT reuse the PDF canvas)
            const imgCanvas = document.createElement('canvas');
            const imgCtx = imgCanvas.getContext('2d', { willReadFrequently: true });

            // CRITICAL: Use naturalWidth/naturalHeight for correct intrinsic sizing.
            // Let CSS handle physical scaling to the printed page.
            imgCanvas.width = img.naturalWidth;
            imgCanvas.height = img.naturalHeight;

            // Draw at full intrinsic resolution
            imgCtx.drawImage(img, 0, 0, imgCanvas.width, imgCanvas.height);

            // Apply QR watermark to bottom-right corner of this canvas
            await applyQrWatermark(imgCanvas, imgCtx);

            generatedDataUrls.push(imgCanvas.toDataURL('image/jpeg', 0.8));

            // Cleanup: clear the dedicated canvas buffer
            imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
          }

          // Memory is freed naturally — fetch ArrayBuffer and pdfFrame.destroy()
          // handle cleanup. No manual buffer zeroing needed.
        }

        if (unmounted) return;

        // Stage all rendered pages into the actual DOM
        setPages(generatedDataUrls);
        setRendering(false);

        // --- AUTO-PRINT MANDATE TRIGGER ---
        // Ensure browser has committed DOM changes of ALL files before opening print popup
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.print();
          }, 300);
        });

      } catch (err) {
        console.error("[Canvas Engine] Multi-file rendering failed:", err);
      }
    };

    renderAllFiles();

    return () => { unmounted = true; };
  }, [payload]);


  // 2. THE DESTRUCTION EVENT (MANDATE 5 & KILL SWITCH)
  useEffect(() => {
    const handleAfterPrint = () => {
      console.log('[Window] Browser print dialog closed. Engaging zero-retention kill switch.');
      
      // Flush rendering arrays visually
      setPages([]);

      // Propagate secure completion token upward to immediately invoke Redis DEL 
      onPrintComplete(payload.printToken);
    };

    // The single most important hook protecting zero retention 
    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [payload, onPrintComplete]);


  return (
    <div className="w-full relative flex flex-col items-center secure-blur print:filter-none">
        
        {pages.map((dataUrl, index) => (
          <div key={index} className="print-page w-full flex justify-center print:m-0 print:block">
            <img 
              src={dataUrl} 
              alt={`Page ${index + 1}`} 
              className="max-w-full h-auto print:w-full print:max-w-[100vw]"
            />
          </div>
        ))}
        
        {rendering && (
          <div className="absolute inset-0 bg-surface/70 backdrop-blur-[12px] flex items-center justify-center no-print">
            <div className="bg-primary px-8 py-4 rounded-xl shadow-ambient flex flex-col items-center">
               <span className="tracking-widest uppercase text-surface-container-lowest font-semibold mb-2">
                 Preparing Canvas...
               </span>
               {progress.total > 0 && (
                 <span className="text-surface-container-highest opacity-90 text-sm">
                    {progress.label}
                 </span>
               )}
            </div>
          </div>
        )}

    </div>
  );
}
