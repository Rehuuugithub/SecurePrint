import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import DocumentViewer from './components/DocumentViewer';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [socket, setSocket] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [incomingDocument, setIncomingDocument] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Initial code reception
    newSocket.on('pairing_code_generated', (data) => {
      setPairingCode(data.code);
      // Fallback to 60s if the backend didn't securely attach expiresIn 
      setTimeLeft(data.expiresIn || 60);
    });

    // Payloads pushed exactly to this socket id
    newSocket.on('document_incoming', (payload) => {
      console.log(`[Socket] Document decoupled... Token: ${payload.printToken.substring(0, 8)}`);
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

  return (
    <div className="min-h-screen bg-surface font-inter text-on_surface flex flex-col items-center justify-center p-8">
      
      {!incomingDocument ? (
        // The Vault-Atelier Idle Portal (Design.md)
        <div className="bg-surface-container-low p-12 rounded-[2rem] flex flex-col items-center justify-center shadow-ambient w-full max-w-[420px]">
          <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col items-center w-full shadow-sm">
            
            {/* Gradient Line / Tab Visualifier for "Secure State" */}
            <div className="w-12 h-1.5 rounded-full bg-gradient-to-r from-primary to-primary-container mb-6 opacity-80" />
            
            <h2 className="text-[1.5rem] font-semibold tracking-tight text-on_surface mb-1">
              PrintIt Vault
            </h2>
            <p className="text-[0.875rem] text-on_secondary_container mb-8 font-medium">
              Enter this token on your device
            </p>
            
            {/* Pairing Code with Monospaced/Tight styling */}
            <div className="text-[3.5rem] tracking-tight font-extrabold text-primary bg-surface-container-low px-8 py-4 rounded-xl mb-8 flex justify-center items-center gap-2">
              {pairingCode ? (
                pairingCode.split('').map((char, index) => (
                  <span key={index} className="w-[1.2em] text-center bg-surface-container-lowest rounded-md shadow-sm border border-outline_variant/15">
                    {char}
                  </span>
                ))
              ) : (
                <span className="text-outline_variant opacity-50 text-[1.5rem]">Generating...</span>
              )}
            </div>

            {/* Hardware Status Indicator */}
            <div className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-on_secondary_container mb-2 px-2">
              <span>Expiry</span>
              <span className={`transition-colors ${timeLeft < 10 ? 'text-red-500' : 'text-tertiary'}`}>
                {timeLeft}s
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
               <div 
                  className="h-full bg-primary-container transition-all duration-1000 ease-linear shadow-none"
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
               />
            </div>

          </div>
        </div>
      ) : (
        // When document arrives, hide idle portal to enforce single-action mindset
        <div className="w-full max-w-lg mb-8 text-center no-print">
            <h2 className="text-3xl font-bold tracking-tight text-on_surface mb-2">Decrypting Payload</h2>
            <p className="text-on_secondary_container">Print dialog triggering automatically globally...</p>
        </div>
      )}

      {/* Render Document directly in flow but dynamically obscured via CSS */}
      {incomingDocument && (
        <DocumentViewer 
           payload={incomingDocument} 
           onPrintComplete={handlePrintComplete}
        />
      )}

    </div>
  );
}

export default App;
