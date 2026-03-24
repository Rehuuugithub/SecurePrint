import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Use the locally bundled worker via Vite ?url import strategy
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function DocumentViewer({ payload, onPrintComplete }) {
  const [pages, setPages] = useState([]); // Store rendering DataURLs in state 
  const [rendering, setRendering] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 1. Core Sequential Rendering Engine
  useEffect(() => {
    let unmounted = false;

    const renderDocument = async () => {
      try {
        if (!payload || !payload.fileBase64) return;
        setRendering(true);

        const binaryString = window.atob(payload.fileBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const generatedDataUrls = [];

        // Temporary invisible Canvas for sequential rendering queue
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });

        // Branch by MimeType (PDF explicitly requires multi-page sequential loop)
        if (payload.mimeType === 'application/pdf') {
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdfFrame = await loadingTask.promise;
            
            const totalPages = pdfFrame.numPages;
            setProgress({ current: 0, total: totalPages });

            // Ensure Sequential Await Loop per specifications (No Promise.all)
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              if (unmounted) return;
              
              setProgress({ current: pageNum, total: totalPages });
              
              const page = await pdfFrame.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 }); // Hi-Res
              
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: context, viewport }).promise;

              // Apply Mandate 6: Visible Print Watermark to bottom edge
              context.font = "bold 24px 'Inter', sans-serif";
              context.fillStyle = "rgba(0, 0, 0, 0.45)"; // ambient hue
              context.textAlign = "center";
              context.fillText(
                `Securely Printed via PrintIt | Timestamp: ${new Date().toISOString()}`, 
                canvas.width / 2, 
                canvas.height - 40
              );

              // Extract serialized image data
              generatedDataUrls.push(canvas.toDataURL('image/jpeg', 0.8));
              
              // explicitly clear buffer to keep RAM usage low
              context.clearRect(0, 0, canvas.width, canvas.height); 
            }

        } else if (payload.mimeType.startsWith('image/')) {
            setProgress({ current: 1, total: 1 });
            const blob = new Blob([bytes], { type: payload.mimeType });
            const imgUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.src = imgUrl;

            await new Promise((resolve, reject) => {
               img.onload = () => { URL.revokeObjectURL(imgUrl); resolve(); };
               img.onerror = () => { URL.revokeObjectURL(imgUrl); reject(); };
            });

            canvas.height = img.height;
            canvas.width = img.width;
            context.drawImage(img, 0, 0);

            context.font = "bold 24px 'Inter', sans-serif";
            context.fillStyle = "rgba(0, 0, 0, 0.45)";
            context.textAlign = "center";
            context.fillText(
              `Securely Printed via PrintIt | Timestamp: ${new Date().toISOString()}`, 
              canvas.width / 2, 
              canvas.height - 40
            );

            generatedDataUrls.push(canvas.toDataURL('image/jpeg', 0.8));
        }

        if (unmounted) return;
        
        // Stage images into the actual DOM
        setPages(generatedDataUrls);
        setRendering(false);
        
        // --- AUTO-PRINT MANDATE TRIGGER ---
        // Ensure browser has committed DOM changes of images sequentially before opening print popup
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.print();
          }, 300);
        });

      } catch (err) {
        console.error("[Canvas Engine] Decoupling Engine failed:", err);
      }
    };

    renderDocument();

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
    <div className="w-full relative flex flex-col items-center p-8 bg-surface-container-low border-[1.5px] border-outline_variant/15 rounded-[2rem] shadow-ambient overflow-hidden secure-blur print:m-0 print:border-none print:shadow-none print:bg-white print:p-0">
        
        {pages.map((dataUrl, index) => (
          <div key={index} className="print-page w-full flex justify-center mb-8 print:m-0 print:block">
            <img 
              src={dataUrl} 
              alt={`Page ${index + 1}`} 
              className="max-w-full h-auto rounded-lg shadow-sm print:w-[100vw] print:shadow-none"
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
                    Decrypting & Processing Page {progress.current} of {progress.total}...
                 </span>
               )}
            </div>
          </div>
        )}

    </div>
  );
}
