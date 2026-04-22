import { useState, useRef } from 'react';

function App() {
  const [files, setFiles] = useState([]);

  // Print Settings State
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);

  // Handshake State (Strictly 6-Digits)
  const [pairingCode, setPairingCode] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg: '' }

  const fileInputRef = useRef(null);

  // File Handlers (Strictly .pdf, .png, .jpg per PRD constraints) — Multi-file support
  const validateAndSetFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];

    const validFiles = [];
    const invalidFiles = [];

    for (const file of selectedFiles) {
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      setStatus({ type: 'error', msg: `Invalid file type(s) skipped: ${invalidFiles.join(', ')}. Only .pdf, .png, and .jpg allowed.` });
    } else {
      setStatus(null);
    }

    if (validFiles.length > 0) {
      // Cap at 10 files to match backend limit
      setFiles((prev) => [...prev, ...validFiles].slice(0, 10));
    }
  };

  const handleFileChange = (e) => {
    validateAndSetFiles(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndSetFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Enforcement of strictly 6-digit numeric input
  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPairingCode(val);
  };

  // --- REST API SUBMISSION (Multi-File) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      setStatus({ type: 'error', msg: 'Please select at least one document.' });
      return;
    }

    if (pairingCode.length !== 6) {
      setStatus({ type: 'error', msg: 'Pairing code must be exactly 6 digits.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // Form-Data Enforcement: 
      // MUST NOT send JSON Base64 body. MUST construct FormData instance.
      const formData = new FormData();
      // Append each file under the 'files' key to match backend upload.array('files', 10)
      for (const file of files) {
        formData.append('files', file);
      }
      formData.append('pairingCode', pairingCode);
      formData.append('settings', JSON.stringify({ copies, color }));

      // REST API fetch call to Cloud API
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
        setFiles([]);
        setPairingCode('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus({ type: 'error', msg: data.error || 'Upload failed due to server error.' });
      }

    } catch (error) {
      console.error("Upload Error:", error);
      setStatus({ type: 'error', msg: 'Network error. Ensure the Secure Printout backend is running.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Total size of all selected files
  const totalSizeMB = files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 font-inter text-on_surface selection:bg-primary selection:text-white">

      {/* ═══════════════════════ NAVBAR ═══════════════════════ */}
      <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Shield Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Secure Printout</h1>
              <p className="text-[0.65rem] font-medium text-slate-400 tracking-wide uppercase">Zero-Retention Cloud Printing</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              v2.0 Secure
            </span>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <main className="flex-1 flex flex-col items-center w-full">

        {/* ─── "How it Works" SaaS Banner ─── */}
        <section className="w-full max-w-4xl mx-auto px-6 pt-10 pb-4">
          <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 shadow-sm">
            <h2 className="text-center text-sm font-bold uppercase tracking-widest text-primary/70 mb-6">How it Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl">📄</span>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold mb-2">1</span>
                <h3 className="font-bold text-slate-800 text-sm">Upload Document</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Drop your PDF or image files — supports up to 10 at once</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/50 rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl">🔐</span>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold mb-2">2</span>
                <h3 className="font-bold text-slate-800 text-sm">Enter Shop Code</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Type the 6-digit code displayed at the print shop counter</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl">🖨️</span>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold mb-2">3</span>
                <h3 className="font-bold text-slate-800 text-sm">Auto-Print Securely</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Document prints instantly — zero data retained after printing</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Upload Form Card ─── */}
        <section className="w-full max-w-md mx-auto px-6 py-6">

          {status && (
            <div className={`w-full mb-6 p-4 rounded-xl text-sm font-medium text-center backdrop-blur-sm ${status.type === 'error' ? 'bg-red-50/80 text-red-600 border border-red-200/60' : 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/60'}`}>
              {status.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">

            {/* 1. The Vault Dropzone — Multi-file support */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group bg-white cursor-pointer w-full min-h-[200px] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300/70 hover:border-primary/40 transition-all duration-300 hover:bg-blue-50/30 hover:shadow-lg hover:shadow-primary/5 py-6"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                className="hidden"
              />

              {files.length === 0 ? (
                <>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-semibold text-[0.95rem]">Tap or Drop Documents</span>
                  <span className="text-slate-400 text-xs mt-1.5 font-medium">Accepts .pdf, .png, .jpg — up to 10 files</span>
                </>
              ) : (
                <div className="flex flex-col items-center w-[90%] gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="font-semibold text-primary text-[1rem]">
                    {files.length} {files.length === 1 ? 'file' : 'files'} selected
                  </span>
                  <span className="text-xs text-slate-400 mb-2">{totalSizeMB.toFixed(2)} MB total</span>

                  {/* File list with individual remove buttons */}
                  <div className="w-full max-h-[140px] overflow-y-auto flex flex-col gap-1.5 px-1">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-xs border border-slate-100"
                      >
                        <span className="truncate flex-1 mr-2 font-medium text-slate-700">{f.name}</span>
                        <span className="text-slate-400 mr-2 whitespace-nowrap">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="text-red-400 hover:text-red-600 transition-colors font-bold text-sm leading-none"
                          aria-label={`Remove ${f.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {files.length < 10 && (
                    <span className="text-[0.7rem] text-slate-400 mt-1">Tap to add more files</span>
                  )}
                </div>
              )}
            </div>

            {/* .docx Advisory Note */}
            <p className="text-xs text-slate-400 text-center -mt-2 px-4 font-medium leading-relaxed">
              <span className="inline-block mr-1">📄</span>
              For Word documents (.docx), please save as PDF before uploading.
            </p>

            {/* 2. The Settings Layer */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <label className="font-semibold text-sm text-slate-700">Copies</label>
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <button type="button" onClick={() => setCopies(Math.max(1, copies - 1))} className="text-lg px-1.5 font-bold text-primary hover:text-primary-container disabled:opacity-30 transition-colors" disabled={copies <= 1}>−</button>
                  <span className="font-bold w-5 text-center text-slate-800">{copies}</span>
                  <button type="button" onClick={() => setCopies(copies + 1)} className="text-lg px-1.5 font-bold text-primary hover:text-primary-container transition-colors">+</button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <label className="font-semibold text-sm text-slate-700">Color Printing</label>
                <button
                  type="button"
                  onClick={() => setColor(!color)}
                  className={`w-[48px] h-[26px] rounded-full p-[3px] transition-all duration-300 flex ${color ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="bg-white w-[20px] h-[20px] rounded-full shadow-sm transition-transform" />
                </button>
              </div>
            </div>

            {/* 3. The Handshake Coupling */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <label className="block text-center font-bold text-xs text-slate-400 mb-4 uppercase tracking-[0.2em]">
                Shop Pairing Code
              </label>
              <input
                type="text"
                value={pairingCode}
                onChange={handleCodeChange}
                placeholder="● ● ● ● ● ●"
                className="w-full text-center text-[2.25rem] tracking-[0.5em] font-bold bg-slate-50 py-4 rounded-xl border border-slate-200/60 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 focus:outline-none transition-all placeholder:text-slate-300 placeholder:tracking-[0.4em] placeholder:text-xl"
              />
            </div>

            {/* Print Action */}
            <button
              type="submit"
              disabled={isLoading || files.length === 0 || pairingCode.length !== 6}
              className={`w-full py-4 rounded-xl text-sm font-bold tracking-wider uppercase transition-all duration-300 ${files.length === 0 || pairingCode.length !== 6
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isLoading
                    ? 'bg-primary/80 text-white cursor-wait'
                    : 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Encrypting & Routing...
                </span>
              ) : 'SECURE PRINT'}
            </button>

          </form>
        </section>
      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="w-full bg-slate-900 text-slate-300 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

            {/* About / Legal */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">About</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Zero-retention cloud printing infrastructure. Your documents are never stored — they exist only in volatile memory for the duration of the print operation.
              </p>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>

            {/* Open Source */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Open Source</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Secure Printout is open source. Audit our code, report issues, or contribute.
              </p>
              <a
                href="https://github.com/Rehuuugithub/SecurePrint"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                Contribute on GitHub
              </a>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Connect</h4>
              <a
                href="https://www.linkedin.com/in/mohammed-raihan-7291732a3/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                Mohammed Raihan
              </a>
            </div>

            {/* Team & Support */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Team & Support</h4>
              <div className="flex flex-col gap-2.5">
                <div>
                  <span className="block text-[0.65rem] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Lead</span>
                  <a href="mailto:raihan734002@gmail.com" className="text-xs text-slate-400 hover:text-white transition-colors">rihan734002@gmail.com</a>
                </div>
                <div>
                  <span className="block text-[0.65rem] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Team</span>
                  <a href="mailto:aakashharsh805@gmail.com" className="text-xs text-slate-400 hover:text-white transition-colors">aakashharsh805@gmail.com</a>
                </div>
                <div>
                  <span className="block text-[0.65rem] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Team</span>
                  <a href="mailto:raniishu039@gmail.com" className="text-xs text-slate-400 hover:text-white transition-colors">raniishu039@gmail.com</a>
                </div>
                <div>
                  <span className="block text-[0.65rem] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Team</span>
                  <a href="mailto:Jmxalxo@gmail.com" className="text-xs text-slate-400 hover:text-white transition-colors">Jmxalxo@gmail.com</a>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Bottom */}
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} Secure Printout. All rights reserved.</p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Zero-Retention Architecture
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
