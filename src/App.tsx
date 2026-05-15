import React, { useState, useEffect, useRef } from 'react';
import { Hash, Zap, BookOpen, GraduationCap, Shield, Server, Coins, Cpu, CheckCircle2, Terminal, Send, Lock, Eye, Network, Menu, Users, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  sender: 'user' | 'archangel' | 'system';
  text: string;
  timestamp: Date;
};

type Wallet = {
  algorithm: string;
  address: string;
  publicKeyFull: string;
  publicKeyPreview: string;
  publicKeySize: number;
  privateKeySize: number;
  balance: number;
  profile: {
    username: string;
    role: string;
  };
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'system',
      text: 'CYBERHEAVEN PROTOCOL V7.0 LOADED. QUANTUM RESISTANCE: MAXIMUM.',
      timestamp: new Date()
    },
    {
      id: 'init-2',
      sender: 'archangel',
      text: 'Welcome to Cyberheaven University. Type `/connect` to establish a Post-Quantum link, or `/help` for guidance.',
      timestamp: new Date()
    }
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'chat' | 'courses' | 'ledger'>('chat');
  const [catalog, setCatalog] = useState<{title: string, cost: number}[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  
  const [showGate, setShowGate] = useState(true);
  const [gateUsername, setGateUsername] = useState('');
  const [gateRole, setGateRole] = useState('Initiate');
  const [gateAlg, setGateAlg] = useState('ML-DSA-44');
  const [gatePassword, setGatePassword] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/university/catalog')
      .then(res => res.json())
      .then(data => setCatalog(data.courses))
      .catch(console.error);

    const savedWalletStr = localStorage.getItem('cyberheaven_wallet');
    if (savedWalletStr) {
      try {
         const savedWallet = JSON.parse(savedWalletStr);
         fetch('/api/auth/restore', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ wallet: savedWallet })
         }).then(res => {
           if(res.ok) {
             setWallet(savedWallet);
             setShowGate(false);
             addMessage('system', "Quantum session tether re-established from local storage.");
             fetchUsers();
           } else {
             localStorage.removeItem('cyberheaven_wallet');
           }
         });
      } catch(e) {
         localStorage.removeItem('cyberheaven_wallet');
      }
    }

    const interval = setInterval(() => {
       fetchUsers();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setOnlineUsers(data.users || []);
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addMessage = (sender: 'user' | 'archangel' | 'system', text: string) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substring(7), sender, text, timestamp: new Date() }]);
  };

  const updateBalance = async (address: string) => {
    try {
      const res = await fetch(`/api/crypto/balance/${address}`);
      if(res.ok) {
         const data = await res.json();
         setWallet(prev => prev ? { ...prev, balance: data.balance } : null);
      }
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: gateAlg, username: gateUsername, role: gateRole, password: gatePassword })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || data.message);
      
      const walletData = {
        algorithm: data.algorithm,
        address: data.address,
        publicKeyFull: data.publicKeyFull,
        publicKeyPreview: data.publicKeyPreview,
        publicKeySize: data.publicKeySizeInBytes,
        privateKeySize: data.privateKeySizeInBytes,
        balance: data.balance,
        profile: data.profile
      };
      
      setWallet(walletData);
      localStorage.setItem('cyberheaven_wallet', JSON.stringify(walletData));
      
      setShowGate(false);
      fetchUsers();
      addMessage('archangel', `Identity forged. Welcome, **${data.profile.username}**. You carry the rank of **${data.profile.role}**.\n\nYour address is \`${data.address}\` secured via **${data.algorithm}**.`);
    } catch (e: any) {
      alert("Registration failed: " + e.message);
    }
  };

  const handleCommand = async (e?: React.FormEvent, programmaticInput?: string) => {
    if (e) e.preventDefault();
    const input = (programmaticInput || commandInput).trim();
    if (!input) return;

    addMessage('user', input);
    setCommandInput('');
    setIsTyping(true);

    const [cmd, ...args] = input.split(' ');

    setTimeout(async () => {
      try {
        if (cmd === '/connect') {
           addMessage('system', "Connection is now managed through the Cyberheaven Gate UI upon entry.");
        } 
        else if (cmd === '/teach') {
           if (!wallet) throw new Error("You must `/connect` first.");
           const course = args.join(' ');
           if (!course) throw new Error("Provide a subject to teach, e.g. `/teach Quantum Fields 101`");
           
           const res = await fetch('/api/university/reward', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ address: wallet.address, course })
           });
           const data = await res.json();
           if(!res.ok) throw new Error(data.error);
  
           addMessage('archangel', data.message);
           await updateBalance(wallet.address);
        }
        else if (cmd === '/study') {
           if (!wallet) throw new Error("You must be connected first.");
           const res = await fetch('/api/university/study', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ address: wallet.address })
           });
           const data = await res.json();
           if(!res.ok) throw new Error(data.error);
  
           addMessage('archangel', data.message);
           await updateBalance(wallet.address);
        }
        else if (cmd === '/learn') {
           if (!wallet) throw new Error("You must `/connect` first.");
           const course = args.join(' ');
           if (!course) throw new Error("Provide a subject to learn, e.g. `/learn Advanced Lattice Cryptography`");
  
           const res = await fetch('/api/university/learn', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ address: wallet.address, course })
           });
           const data = await res.json();
           if(!res.ok) throw new Error(data.error);
  
           addMessage('archangel', data.message);
           await updateBalance(wallet.address);
        }
        else if (cmd === '/balance') {
           if (!wallet) throw new Error("You must `/connect` first.");
           await updateBalance(wallet.address);
           addMessage('system', "Syncing with Layer 1 Ledger...");
           addMessage('archangel', `Your current essence is **${wallet.balance} CHT**.\nAddress: \`${wallet.address}\``);
        }
        else if (cmd === '/send') {
           if (!wallet) throw new Error("You must `/connect` first.");
           const amount = parseInt(args[0]);
           const recipient = args[1];
           if (isNaN(amount) || !recipient) throw new Error("Correct format: `/send <amount> <address>`");
  
           const res = await fetch('/api/crypto/sign', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ sender: wallet.address, recipient, amount, publicKey: wallet.publicKeyFull, algorithm: wallet.algorithm })
           });
           const data = await res.json();
           if(!res.ok) throw new Error(data.error);
  
           addMessage('system', "Quantum-Safe signature constructed. Appended to Mempool.");
           addMessage('archangel', `Transaction signed using **${wallet.algorithm}** (Signature size: ${data.signatureSizeBytes} bytes). Requires \`/network\` processing to finalize consensus.\n\nTX ID: \`${data.txId}\``);
        }
        else if (cmd === '/network') {
           if (!wallet) throw new Error("You must `/connect` first.");
           addMessage('system', 'Triggering Layer 2 ZKP Compression over current Mempool...');
           
           const l2Res = await fetch('/api/network/compress', { method: 'POST' });
           const l2Data = await l2Res.json();
           if(!l2Res.ok) throw new Error(l2Data.error);
           
           addMessage('archangel', `Compressed ${l2Data.txCount} bloated lattice transaction(s) down to a **${l2Data.compressedBytes} byte** ZK-SNARK.`);
           
           addMessage('system', 'Submitting ZK-Proof to Layer 3 Cyberheaven Validators...');
           const l3Res = await fetch('/api/network/consensus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proof: l2Data.proof, txPayload: l2Data.txPayload })
           });
           const l3Data = await l3Res.json();
           if(!l3Res.ok) throw new Error(l3Data.error);
  
           addMessage('archangel', `Consensus reached via **${l3Data.mechanism}**. Block **${l3Data.blockHeight}** finalized in ${l3Data.finalityTimeMs}ms with hash \`${l3Data.blockHash}\`. ${l3Data.processedTransactions} transactions applied to ledger.`);
           await updateBalance(wallet.address);
        }
        else if (cmd === '/history') {
           if (!wallet) throw new Error("You must `/connect` first.");
           addMessage('system', "Fetching temporal cryptographic records...");
           
           const res = await fetch(`/api/crypto/history/${wallet.address}`);
           const data = await res.json();
           if (!res.ok) throw new Error(data.error);

           if (data.history.length === 0) {
             addMessage('archangel', "Your essence record is empty.");
           } else {
             const historyMarkdown = data.history.map((tx: any) => {
               const isSender = tx.sender === wallet.address;
               let type = isSender ? 'Sent' : 'Received';
               if (tx.sender === 'CYBERHEAVEN_UNIVERSITY_TREASURY' && !isSender) type = 'Earned';
               if (tx.recipient === 'CYBERHEAVEN_UNIVERSITY_TREASURY' && isSender) type = 'Spent';

               const date = new Date(tx.timestamp).toLocaleString();
               const sign = isSender ? '-' : '+';
               const statusIcon = tx.status === 'confirmed' ? '✅' : '⏳';
               
               return `| ${date} | **${type}** | ${sign}${tx.amount} CHT | ${statusIcon} ${tx.status} | \`${tx.id.substring(0,8)}...\` |`;
             }).join('\n');

             addMessage('archangel', `**TRANSACTION LEDGER**\n\n| Date/Time | Type | Amount | Status | TX ID |\n|---|---|---|---|---|\n${historyMarkdown}`);
           }
        }
         else if (cmd === '/help') {
           addMessage('archangel', `Available incantations:\n\n- \`/study\` : Diligently study in the archives to discover CHT (Initiates)\n- \`/teach <course>\` : Impart wisdom, earn CHT (added to Mempool)\n- \`/learn <course>\` : Spend CHT to gain knowledge\n- \`/send <amount> <address>\` : Transfer CHT in mempool\n- \`/balance\` : Check confirmed holdings\n- \`/history\` : View your temporal essence ledger\n- \`/network\` : Trigger Layer 2 Compress + Layer 3 Consensus`);
        }
        else {
           addMessage('archangel', `Unknown command. Type \`/help\` for the sacred rites.`);
        }
      } catch (e: any) {
        addMessage('system', `ERROR: ${e.message}`);
      } finally {
        setIsTyping(false);
      }
    }, 600); // Simulate network/bot delay
  };

  return (
    <div className="flex bg-[#020203] items-center justify-center min-h-screen w-full sm:p-4 md:p-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 cyberheaven-grid opacity-30 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d4af37]/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Main App Window */}
      <div className="w-full max-w-screen-2xl h-[100vh] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-h-[1000px] bg-[#06080E] text-slate-300 font-sans selection:bg-cyan-900/50 relative overflow-hidden flex sm:rounded-2xl sm:border sm:border-[#ffffff1a] shadow-2xl z-10">
        
      {/* Guild Server Bar (Extreme Left) */}
      <div className={cn(
        "w-16 shrink-0 bg-[#030408]/80 backdrop-blur-md border-r border-[#ffffff0a] flex flex-col items-center py-4 z-20 absolute md:relative h-full transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
         <div className="w-12 h-12 rounded-2xl bg-black border border-[#d4af37]/40 flex items-center justify-center gold-glow cursor-pointer relative group">
            <GraduationCap className="w-6 h-6 text-[#d4af37]" />
            <div className="absolute w-1 h-8 bg-white left-[-18px] rounded-r group-hover:block transition-all"></div>
         </div>
         <div className="w-8 h-px bg-white/10 my-4" />
      </div>

      {/* Channels Sidebar */}
      <div className={cn(
        "w-64 shrink-0 bg-[#090b14]/90 backdrop-blur-md border-r border-[#ffffff0a] flex flex-col z-20 absolute md:relative h-full transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-16" : "-translate-x-[120%] md:translate-x-0 !ml-0"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#ffffff0a] shadow-sm">
          <span className="gold-text-glow font-serif text-[#d4af37] font-bold text-lg tracking-wide">Cyberheaven Univ.</span>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 mb-2">Grand Halls</div>
            <div className="space-y-0.5">
              <ChannelItem icon={<Hash />} label="general-chat" active={activeChannel === 'chat'} onClick={() => setActiveChannel('chat')} />
              <ChannelItem icon={<BookOpen />} label="courses-board" active={activeChannel === 'courses'} onClick={() => setActiveChannel('courses')} />
              <ChannelItem icon={<Network />} label="quantum-ledger" active={activeChannel === 'ledger'} onClick={() => { setActiveChannel('chat'); handleCommand(undefined, '/history'); }} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 mb-2">Systems</div>
            <div className="space-y-0.5">
              <ChannelItem icon={<Shield />} label="pqc-validators" onClick={() => { setActiveChannel('chat'); handleCommand(undefined, '/balance'); }} />
              <ChannelItem icon={<Cpu />} label="l2-zkp-compression" onClick={() => { setActiveChannel('chat'); handleCommand(undefined, '/network'); }} />
              <ChannelItem icon={<Server />} label="l3-dag-consensus" onClick={() => { setActiveChannel('chat'); handleCommand(undefined, '/network'); }} />
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-[#ffffff0a] bg-black/20 flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center relative">
             <Lock className="w-4 h-4 text-cyan-400" />
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#090b14]"></div>
           </div>
           <div className="flex-1 overflow-hidden">
             <div className="text-xs font-bold text-white truncate">{wallet ? wallet.profile.username : 'Disconnected'}</div>
             <div className="text-[10px] text-cyan-500 font-mono flex items-center gap-1 truncate">
               <Zap className="w-3 h-3" /> {wallet ? `Role: ${wallet.profile.role}` : 'Connect.'}
             </div>
           </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        <header className="h-16 border-b border-[#ffffff0a] flex items-center px-4 md:px-6 gap-3 md:gap-4 bg-[#0a0f1a]/50 backdrop-blur-sm shrink-0">
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
             <Menu className="w-6 h-6" />
          </button>
          <Hash className="w-6 h-6 text-[#d4af37]/70 hidden md:block" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white tracking-wide truncate">{activeChannel === 'chat' ? 'general-chat' : 'courses-board'}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest truncate">{activeChannel === 'chat' ? 'Execute commands via CLI' : 'Enroll in syllabuses. Expand your node.'}</div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white ml-auto" onClick={() => setIsMembersOpen(!isMembersOpen)}>
             <Users className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 h-full overflow-hidden flex flex-col">
        {activeChannel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4",
                      m.sender === 'system' ? "px-12 opacity-70" : ""
                    )}
                  >
                    {m.sender !== 'system' && (
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border mt-1",
                        m.sender === 'archangel' ? "bg-black border-[#d4af37]/50 gold-glow" : "bg-cyan-950 border-cyan-500/50"
                      )}>
                        {m.sender === 'archangel' ? <GraduationCap className="w-5 h-5 text-[#d4af37]" /> : <Terminal className="w-5 h-5 text-cyan-400" />}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                       {m.sender !== 'system' && (
                         <div className="flex items-baseline gap-2 mb-1">
                            <span className={cn(
                              "font-bold text-sm",
                              m.sender === 'archangel' ? "text-[#d4af37]" : "text-cyan-400"
                            )}>
                              {m.sender === 'archangel' ? 'Archangel Bot' : 'You'}
                            </span>
                            {m.sender === 'archangel' && (
                              <span className="text-[9px] bg-[#d4af37]/20 text-[#d4af37] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Verified App</span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">
                              {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                         </div>
                       )}

                       <div className={cn(
                         "text-sm leading-relaxed prose prose-invert prose-p:my-1 prose-a:text-cyan-400 prose-code:text-[#d4af37] prose-code:bg-black/50 prose-code:px-1 prose-code:rounded prose-code:border prose-code:border-[#d4af37]/20 prose-td:border prose-td:border-[#ffffff1a] prose-th:border prose-th:border-[#ffffff1a] prose-th:bg-black/50 max-w-none",
                         m.sender === 'system' ? "text-cyan-400 font-mono text-[10px] uppercase tracking-widest bg-cyan-900/10 py-1 px-3 border-l-2 border-cyan-400" : "text-slate-200"
                       )}>
                          {m.sender === 'user' ? (
                            <div className="font-mono text-cyan-300">{m.text}</div>
                          ) : (
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          )}
                       </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                 <div className="flex gap-4 opacity-50">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-black border-[#d4af37]/50 mt-1">
                      <GraduationCap className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce"></span>
                    </div>
                 </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>

            <div className="p-4 md:p-6 pt-0 mt-auto">
              <form onSubmit={(e) => handleCommand(e)} className="relative flex items-center bg-[#0a0f1a] border border-[#ffffff1a] rounded-xl overflow-hidden focus-within:border-cyan-500/50 transition-colors gold-glow">
                <div className="pl-4 text-slate-500">
                   <Terminal className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Message #general-chat (/teach, /balance, /help)..."
                  className="w-full bg-transparent text-slate-200 p-4 outline-none font-sans text-sm"
                  disabled={isTyping}
                />
                <button type="submit" disabled={isTyping || !commandInput.trim()} className="absolute right-2 p-2 bg-black/50 hover:bg-[#d4af37]/20 text-[#d4af37] rounded-lg transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-2 text-[10px] text-center text-slate-500 uppercase tracking-widest font-mono">
                Powered by Cyberheaven Post-Quantum Security
              </div>
            </div>
          </>
        )}

        {activeChannel === 'courses' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {catalog.map(course => (
                 <div key={course.title} className="bg-black/40 border border-[#ffffff0a] rounded-xl p-6 gold-glow flex flex-col hover:border-[#d4af37]/30 transition-colors duration-500">
                   <div className="w-12 h-12 rounded-full bg-[#0a0f1a] border border-[#d4af37]/30 flex items-center justify-center mb-4">
                     <GraduationCap className="w-6 h-6 text-[#d4af37]" />
                   </div>
                   <h3 className="text-white font-bold font-serif text-lg mb-2">{course.title}</h3>
                   <p className="text-slate-400 text-sm mb-6 flex-1">
                     Enroll in this syllabus to enhance your internal knowledge node in the collective.
                   </p>
                   <div className="flex items-center justify-between mt-auto">
                     <div className="text-cyan-400 font-mono font-bold flex items-center gap-1">
                       <CheckCircle2 className="w-4 h-4" /> {course.cost} CHT
                     </div>
                     <button 
                       onClick={() => {
                          setActiveChannel('chat');
                          handleCommand(undefined, `/learn ${course.title}`);
                       }}
                       className="px-4 py-2 bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] font-bold text-xs uppercase tracking-widest rounded hover:bg-[#d4af37] hover:text-black transition-colors"
                     >
                        Learn
                     </button>
                   </div>
                 </div>
               ))}
               {catalog.length === 0 && (
                 <div className="col-span-full text-center text-slate-500 py-12 flex flex-col items-center">
                    <Zap className="w-8 h-8 opacity-20 mb-4 animate-pulse" />
                    Syncing course registry with Layer 1...
                 </div>
               )}
             </div>
          </div>
        )}
        </div>
      </div>

      {/* Right Sidebar: Members / Security Info */}
      <div className={cn(
        "shrink-0 bg-[#090b14]/90 backdrop-blur-md border-l border-[#ffffff0a] z-50 flex flex-col transition-all duration-300 absolute md:relative right-0 h-full",
        isMembersOpen ? "w-72" : "w-0 md:w-72 overflow-hidden"
      )}>
        <div className="h-16 shrink-0 flex items-center px-4 border-b border-[#ffffff0a] font-bold text-xs uppercase tracking-widest text-[#d4af37] justify-between">
          <span>VCN Security Profile</span>
          <button className="md:hidden p-1 text-slate-400 hover:text-white" onClick={() => setIsMembersOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-6 w-72">
          {/* User Profile Card */}
          <div className="bg-black/40 border border-[#ffffff0a] rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
            <div className="w-16 h-16 rounded-full bg-[#0a0f1a] border border-[#d4af37]/50 flex items-center justify-center mb-3 mt-2 gold-glow">
              <Coins className="w-8 h-8 text-[#d4af37]" />
            </div>
            <div className="font-bold text-white text-lg">{wallet ? wallet.profile.username : 'Cyberheaven Vault'}</div>
            <div className="text-[10px] uppercase font-mono text-cyan-400 flex items-center gap-1 mt-1 justify-center">
              <CheckCircle2 className="w-3 h-3" /> {wallet ? `Role: ${wallet.profile.role}` : 'Offline'}
            </div>

            {wallet && (
              <div className="mt-4 w-full bg-[#030408] border border-cyan-900/50 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Available Essence</div>
                <div className="text-2xl font-serif text-[#d4af37] font-bold">{wallet.balance} <span className="text-xs">CHT</span></div>
              </div>
            )}
          </div>

          {wallet ? (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex flex-col gap-2 border-b border-[#ffffff0a] pb-2">
                <span>Node Profile Overview</span>
                <div className="flex items-center gap-2">
                  <button className="text-[9px] text-cyan-400 cursor-pointer hover:bg-cyan-900/30 border border-cyan-400/30 px-1.5 py-0.5 rounded bg-cyan-900/10 transition-colors" onClick={() => {
                     handleCommand(undefined, '/history');
                     if (isMembersOpen) setIsMembersOpen(false);
                  }}>History 📜</button>
                  <button className="text-[9px] text-red-400 cursor-pointer hover:bg-red-900/30 border border-red-400/30 px-1.5 py-0.5 rounded bg-red-900/10 transition-colors" onClick={() => {
                     localStorage.removeItem('cyberheaven_wallet');
                     setWallet(null);
                     setShowGate(true);
                     if (isMembersOpen) setIsMembersOpen(false);
                     addMessage('system', "Quantum session severed. Identity removed from local node.");
                  }}>Sever Link 🔌</button>
                </div>
              </div>
              
              <div className="space-y-1">
                 <div className="text-[10px] text-slate-500 uppercase font-mono">Algorithm</div>
                 <div className="text-sm text-white font-mono bg-black/50 border border-[#ffffff0a] p-2 rounded">{wallet.algorithm}</div>
              </div>

              <div className="space-y-1">
                 <div className="text-[10px] text-slate-500 uppercase font-mono">Ephemeral Address</div>
                 <div className="text-[10px] text-cyan-400 font-mono bg-cyan-900/10 border border-cyan-900/30 p-2 rounded break-all">{wallet.address}</div>
              </div>

              <div className="mt-8">
                 <div className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-[#ffffff0a] pb-2 mb-3">Online Nodes — {onlineUsers.length}</div>
                 <div className="space-y-2">
                    {onlineUsers.map((u, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setCommandInput(`/send 50 ${u.address}`);
                          if (isMembersOpen) setIsMembersOpen(false);
                          setActiveChannel('chat');
                        }}
                        className="flex items-center gap-3 p-2 bg-black/20 rounded hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0a0f1a] border border-cyan-500/30 flex items-center justify-center shrink-0">
                           {u.role === 'Archangel' ? <Shield className="w-4 h-4 text-[#d4af37]" /> : <Terminal className="w-4 h-4 text-cyan-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={cn("text-xs font-bold truncate", u.role === 'Archangel' ? "text-[#d4af37]" : "text-white")}>{u.username}</div>
                           <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {u.role}
                           </div>
                        </div>
                        <div className="text-[8px] opacity-0 group-hover:opacity-100 font-mono text-cyan-500 transition-opacity">SEND TX &rarr;</div>
                      </div>
                    ))}
                 </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#ffffff1a] rounded-xl">
               <Shield className="w-8 h-8 text-slate-600 mb-3" />
               <div className="text-xs text-slate-400 mb-2">No active connection.</div>
               <div className="text-[10px] text-slate-500 font-mono">Use the Gate to establish quantum link.</div>
            </div>
          )}
        </div>
      </div>

      {showGate && (
        <div className="fixed inset-0 z-[100] bg-[#06080E]/95 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4 sm:p-8">
           <div className="max-w-md w-full bg-black/90 border border-[#d4af37]/40 rounded-2xl p-8 shadow-2xl gold-glow relative overflow-hidden my-8">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-[#d4af37] to-cyan-500"></div>
             
             <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#0a0f1a] border border-[#d4af37]/50 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  <Shield className="w-8 h-8 text-[#d4af37]" />
                </div>
             </div>
             
             <h2 className="text-center text-2xl font-serif font-bold text-white mb-2">Cyberheaven Gate</h2>
             <p className="text-center text-xs text-slate-400 font-mono mb-8">Establish quantum-resistant ephemeral identity.</p>

             <form onSubmit={handleRegister} className="space-y-5">
               <div>
                 <label className="block text-[10px] uppercase tracking-widest text-[#d4af37] mb-1 font-bold">Username</label>
                 <input 
                   type="text" 
                   required
                   value={gateUsername}
                   onChange={e => setGateUsername(e.target.value)}
                   className="w-full bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                   placeholder="Enter moniker..."
                 />
               </div>

               <div>
                 <label className="block text-[10px] uppercase tracking-widest text-[#d4af37] mb-1 font-bold">Role Selection</label>
                 <select 
                   value={gateRole}
                   onChange={e => {
                     setGateRole(e.target.value);
                     if (e.target.value !== 'Archangel') setGatePassword('');
                   }}
                   className="w-full bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                 >
                   <option value="Initiate">Initiate (Student - Learns)</option>
                   <option value="Scholar">Scholar (Teacher - Earns)</option>
                   <option value="Archangel">Archangel (Admin - Vault Access)</option>
                 </select>
               </div>

               {gateRole === 'Archangel' && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                   <label className="block text-[10px] uppercase tracking-widest text-[#d4af37] mb-1 font-bold">Vault Access Code</label>
                   <input 
                     type="password" 
                     required
                     value={gatePassword}
                     onChange={e => setGatePassword(e.target.value)}
                     className="w-full bg-[#0a0f1a] border border-[#d4af37]/40 rounded-lg p-3 text-[#d4af37] text-sm outline-none focus:border-[#d4af37] transition-colors font-mono"
                     placeholder="Enter Archangel code (e.g. SERAPHIM99)"
                   />
                 </motion.div>
               )}
               
               <div>
                 <label className="block text-[10px] uppercase tracking-widest text-[#d4af37] mb-1 font-bold">Signature Algorithm</label>
                 <select 
                   value={gateAlg}
                   onChange={e => setGateAlg(e.target.value)}
                   className="w-full bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                 >
                   <option value="ML-DSA-44">ML-DSA-44 (Standard)</option>
                   <option value="ML-DSA-65">ML-DSA-65 (High Security)</option>
                   <option value="FN-DSA-512">FN-DSA-512 (Falcon)</option>
                 </select>
               </div>

               <button type="submit" className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-lg hover:bg-white transition-colors mt-6 font-serif shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer">
                 Generate Identity & Connect
               </button>
             </form>
           </div>
        </div>
      )}
      </div>
    </div>
  );
}

function ChannelItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium",
      active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    )}>
      <div className={cn("w-4 h-4 opacity-70", active ? "text-white" : "text-slate-500")}>
        {icon}
      </div>
      {label}
    </div>
  );
}
