import { useState, useRef } from 'react';

function App() {
  const [file, setFile] = useState(null);
  
  // Print Settings State
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);
  
  // Handshake State (Strictly 6-Digits)
  const [pairingCode, setPairingCode] = useState('');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg: '' }
  
  const fileInputRef = useRef(null);

  // File Handlers (Strictly .pdf, .png, .jpg per PRD constraints)
  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    
    if (allowedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setStatus(null);
    } else {
      setStatus({ type: 'error', msg: 'Invalid file type. Only .pdf, .png, and .jpg allowed.' });
    }
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  // Enforcement of strictly 6-digit numeric input
  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPairingCode(val);
  };

  // --- PHASE 4 REST API SUBMISSION MANDATE ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setStatus({ type: 'error', msg: 'Please select a document.' });
      return;
    }
    
    if (pairingCode.length !== 6) {
      setStatus({ type: 'error', msg: 'Pairing code must be exactly 6 digits.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // 5. Form-Data Enforcement: 
      // MUST NOT send JSON Base64 body. MUST construct FormData instance.
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pairingCode', pairingCode);
      formData.append('settings', JSON.stringify({ copies, color }));

      // 4. REST API fetch call to Cloud API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload`, {
        method: 'POST',
        // Note: Do NOT set "Content-Type" headers manually. 
        // Browser implicitly sets multipart/form-data boundaries when passing FormData.
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', msg: data.message });
        
        // Clear state post-success for Zero-Retention user mindset
        setFile(null);
        setPairingCode('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus({ type: 'error', msg: data.error || 'Upload failed due to server error.' });
      }

    } catch (error) {
       console.error("Upload Error:", error);
       setStatus({ type: 'error', msg: 'Network error. Ensure the PrintIt backend is running.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-inter bg-surface text-on_surface flex flex-col items-center py-12 px-4 selection:bg-primary selection:text-white">
      
      <div className="w-full max-w-md flex flex-col items-center">
         <h1 className="text-[2.25rem] tracking-tight font-bold mb-8 text-center text-primary">PrintIt App</h1>

         {status && (
           <div className={`w-full mb-6 p-4 rounded-xl text-sm font-medium text-center ${status.type === 'error' ? 'bg-red-50 text-red-600 border-[1.5px] border-red-200' : 'bg-[#e6f3ea] text-tertiary border-[1.5px] border-[#c3e6cd]'}`}>
             {status.msg}
           </div>
         )}

         <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            
            {/* 1. The Vault Dropzone (DESIGN.md Mandates) */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="bg-surface-container-highest cursor-pointer w-full h-[220px] rounded-[1.5rem] flex flex-col items-center justify-center shadow-inner-vault transition-transform active:scale-[0.98]"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg" 
                className="hidden" 
              />
              
              {!file ? (
                <>
                  <div className="w-16 h-16 bg-surface-container-lowest rounded-full shadow-ambient flex items-center justify-center mb-4 text-primary">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <span className="text-on_surface font-semibold text-[1rem]">Tap or Drop Document</span>
                  <span className="text-on_secondary_container text-xs mt-1 font-medium">Accepts .pdf, .png, .jpg</span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center bg-surface-container-lowest w-[85%] h-[80%] rounded-[1.25rem] shadow-ambient p-4 text-center">
                   <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <span className="font-semibold text-primary truncate w-full max-w-full px-4">{file.name}</span>
                   <span className="text-xs text-on_secondary_container mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>

            {/* 2. The Settings Layer (Tonal architecture separation) */}
            <div className="bg-surface-container-low p-6 rounded-[1.5rem]">
               <div className="flex justify-between items-center mb-6">
                 <label className="font-semibold text-[0.875rem]">Copies</label>
                 <div className="flex items-center gap-4 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-outline_variant/15">
                   <button type="button" onClick={() => setCopies(Math.max(1, copies - 1))} className="text-xl px-2 font-bold text-primary hover:text-primary-container disabled:opacity-30" disabled={copies <= 1}>−</button>
                   <span className="font-bold w-4 text-center">{copies}</span>
                   <button type="button" onClick={() => setCopies(copies + 1)} className="text-xl px-2 font-bold text-primary hover:text-primary-container">+</button>
                 </div>
               </div>

               <div className="flex justify-between items-center">
                 <label className="font-semibold text-[0.875rem]">Color Printing</label>
                 <button 
                   type="button" 
                   onClick={() => setColor(!color)}
                   className={`w-[50px] h-[28px] rounded-full p-1 transition-colors duration-300 flex ${color ? 'bg-primary justify-end' : 'bg-outline_variant/40 justify-start'}`}
                 >
                   <div className="bg-surface-container-lowest w-[20px] h-[20px] rounded-full shadow-sm" />
                 </button>
               </div>
            </div>

            {/* 3. The Handshake Coupling */}
            <div className="bg-surface-container-low p-6 rounded-[1.5rem]">
               <label className="block text-center font-semibold text-[0.875rem] text-on_secondary_container mb-4 uppercase tracking-wider">
                 Shop Pairing Code
               </label>
               <input
                 type="text"
                 value={pairingCode}
                 onChange={handleCodeChange}
                 placeholder="------"
                 className="w-full text-center text-[2.5rem] tracking-[0.5em] font-bold bg-surface-container-lowest py-4 rounded-xl shadow-ambient focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:opacity-30 placeholder:tracking-tight border-none"
               />
            </div>

            {/* Print Action / Success styling explicitly tertiary if valid */}
            <button
               type="submit"
               disabled={isLoading || !file || pairingCode.length !== 6}
               className={`w-full py-5 rounded-[1.25rem] text-[1rem] font-bold tracking-wide transition-all ${
                 !file || pairingCode.length !== 6 
                  ? 'bg-outline_variant/20 text-on_secondary_container/50 cursor-not-allowed' 
                  : isLoading 
                    ? 'bg-primary-container text-white opacity-80 cursor-wait'
                    : 'bg-tertiary text-white shadow-ambient hover:shadow-lg active:scale-[0.98]'
               }`}
            >
              {isLoading ? 'Encrypting & Routing...' : 'SECURE PRINT'}
            </button>

         </form>
      </div>

    </div>
  );
}

export default App;
