import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import DocumentViewer from './components/DocumentViewer';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [socket, setSocket] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [incomingDocument, setIncomingDocument] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    // Initial code reception
    newSocket.on('pairing_code_generated', (data) => {
      setPairingCode(data.code);
      // Fallback to 60s if the backend didn't securely attach expiresIn 
      setTimeLeft(data.expiresIn || 60);
    });

    // Payloads pushed exactly to this socket id
    newSocket.on('document_incoming', (payload) => {
      console.log(`[Socket] Document payload received... Token: ${payload.printToken.substring(0, 8)}, Files: ${payload.files?.length || 1}`);
      setIncomingDocument(payload);
    });

    return () => newSocket.disconnect();
  }, []);

  // Idle State Timer (Strict 60s Mandate)
  useEffect(() => {
    if (!pairingCode) return;
    if (incomingDocument) return; // Halt timer entirely during print operation

    if (timeLeft <= 0) {
      socket?.emit('request_new_code');
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, pairingCode, incomingDocument, socket]);

  // Propagation of The Kill Switch back to the backend
  const handlePrintComplete = (token) => {
    socket?.emit('print_completed', { printToken: token });
    setIncomingDocument(null);
  };

  // Timer percentage for progress ring
  const timerPercent = (timeLeft / 60) * 100;

  return (
    <div className="min-h-screen font-inter text-white flex flex-col relative overflow-hidden">
      
      {/* ═══════════════════════ BACKGROUND LAYERS ═══════════════════════ */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 -z-20 no-print" />
      {/* Subtle grid pattern overlay */}
      <div className="fixed inset-0 -z-10 opacity-[0.03] no-print" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      {/* Floating gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10 no-print" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10 no-print" />

      {/* ═══════════════════════ NAVBAR ═══════════════════════ */}
      <nav className="w-full border-b border-white/5 bg-white/[0.02] backdrop-blur-xl no-print">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Shop Portal</h1>
              <p className="text-[0.65rem] font-medium text-slate-400 tracking-wide uppercase">Secure Printout v2.0</p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-500 ${
            isConnected 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {isConnected ? 'Secure Connection Active' : 'Disconnected'}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {!incomingDocument ? (
          /* ─── The Vault Idle Portal ─── */
          <div className="w-full max-w-lg flex flex-col items-center">
            
            {/* Eyebrow label */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-blue-400/60" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400/70">Waiting for Document</span>
              <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-blue-400/60" />
            </div>

            {/* Main Vault Card */}
            <div className="w-full bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-3xl p-10 flex flex-col items-center shadow-2xl shadow-black/20">

              {/* Title */}
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
                Secure Printout Vault
              </h2>
              <p className="text-sm text-slate-400 mb-10 font-medium">
                Show this code to the customer
              </p>

              {/* ═══ MASSIVE PAIRING CODE ═══ */}
              <div className="w-full flex justify-center items-center gap-3 mb-10">
                {pairingCode ? (
                  pairingCode.split('').map((char, index) => (
                    <div
                      key={index}
                      className="relative w-[72px] h-[90px] bg-gradient-to-b from-white/10 to-white/[0.04] border border-white/15 rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 group hover:border-blue-400/40 transition-all duration-300"
                    >
                      <span className="font-['JetBrains_Mono'] text-[3rem] font-extrabold bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent leading-none select-all">
                        {char}
                      </span>
                      {/* Subtle glow beneath each digit */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400/20 rounded-full blur-sm" />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 py-8">
                    <svg className="animate-spin w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    <span className="text-slate-500 text-sm font-medium">Generating secure code...</span>
                  </div>
                )}
              </div>

              {/* Timer Section */}
              <div className="w-full">
                <div className="flex items-center justify-between text-xs mb-2.5 px-1">
                  <span className="font-semibold uppercase tracking-widest text-slate-500">Code expires in</span>
                  <span className={`font-bold font-['JetBrains_Mono'] text-sm transition-colors duration-300 ${
                    timeLeft < 10 ? 'text-red-400' : timeLeft < 20 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {timeLeft}s
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      timeLeft < 10 ? 'bg-gradient-to-r from-red-500 to-red-400' : 
                      timeLeft < 20 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                      'bg-gradient-to-r from-blue-500 to-emerald-400'
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Tagline */}
            <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Documents are encrypted in transit and never stored on disk
            </div>
          </div>

        ) : (
          /* ─── Document Incoming State ─── */
          <div className="w-full max-w-lg mb-8 text-center no-print">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
              <svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Processing</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Decrypting Payload</h2>
            <p className="text-slate-400">Print dialog will trigger automatically...</p>
          </div>
        )}

        {/* Render Document directly in flow but dynamically obscured via CSS */}
        {incomingDocument && (
          <DocumentViewer 
             payload={incomingDocument} 
             onPrintComplete={handlePrintComplete}
          />
        )}
      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="w-full border-t border-white/5 py-6 no-print">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Secure Printout</p>
          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full" />
            Zero-Retention Architecture
          </p>
        </div>
      </footer>

    </div>
  );
}

export default App;
