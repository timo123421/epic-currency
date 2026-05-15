import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Cpu, Network, Zap, Search, Filter, ChevronDown } from 'lucide-react';
import { Wallet } from '../App';

const SearchableSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {value: string, label: string}[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.value.toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm cursor-pointer flex justify-between items-center"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
      >
        <span className={selectedOption ? "" : "text-slate-500 truncate"}>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#090b14] border border-[#d4af37]/30 rounded shadow-2xl overflow-hidden flex flex-col pt-2 pb-1" style={{ maxHeight: '240px' }}>
          <div className="px-2 pb-2 border-b border-white/10 shrink-0">
            <input 
              type="text" 
              placeholder="Search by name or address..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-[#d4af37]/50 transition-colors placeholder:text-slate-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? <div className="p-3 text-slate-500 text-xs text-center font-mono">No results found.</div> : null}
            {filteredOptions.map(o => (
              <div 
                key={o.value} 
                className={`px-3 py-2 text-white text-xs cursor-pointer rounded mb-0.5 truncate transition-colors ${o.value === value ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'hover:bg-white/10'}`}
                onClick={() => {
                  onChange(o.value);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const ArchangelVault = ({ wallet }: { wallet: Wallet | null }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [targetAddress, setTargetAddress] = useState('');
  const [amountOffset, setAmountOffset] = useState('');
  
  const [roleTarget, setRoleTarget] = useState('');
  const [newRole, setNewRole] = useState('Initiate');

  const [logSearch, setLogSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  const filteredLogs = logs.filter(log => {
      let matches = true;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) matches = false;
      if (dateFilter !== 'ALL') {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (dateFilter === '24H' && now - log.timestamp > oneDay) matches = false;
          if (dateFilter === '7D' && now - log.timestamp > 7 * oneDay) matches = false;
          if (dateFilter === '30D' && now - log.timestamp > 30 * oneDay) matches = false;
      }
      if (logSearch) {
          const s = logSearch.toLowerCase();
          if (!log.adminAddress.toLowerCase().includes(s) &&
              !log.targetAddress.toLowerCase().includes(s) &&
              !log.details.toLowerCase().includes(s)
          ) {
              matches = false;
          }
      }
      return matches;
  });

  const fetchAdminData = async () => {
    if (!wallet || wallet.profile.role !== 'Archangel') return;
    setLoading(true);
    try {
      const uRes = await fetch('/api/admin/users', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wallet.token}` },
      });
      if(uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users);
      }

      const lRes = await fetch('/api/admin/audit_logs', {
        headers: { 'Authorization': `Bearer ${wallet.token}` }
      });
      if(lRes.ok) {
        const lData = await lRes.json();
        setLogs(lData.logs);
      }
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, [wallet]);

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!targetAddress) {
      alert("Please select a target address.");
      return;
    }
    try {
      const res = await fetch('/api/admin/adjust_balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wallet.token}` },
        body: JSON.stringify({ targetAddress, amountOffset: parseInt(amountOffset, 10) })
      });
      if(res.ok) {
        alert("Balance adjusted successfully.");
        setAmountOffset('');
        fetchAdminData();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch(e: any) { alert(e.message); }
  }

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!roleTarget) {
      alert("Please select a target address.");
      return;
    }
    try {
      const res = await fetch('/api/admin/assign_role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wallet.token}` },
        body: JSON.stringify({ targetAddress: roleTarget, newRole })
      });
      if(res.ok) {
        alert("Role assigned successfully.");
        fetchAdminData();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch(e: any) { alert(e.message); }
  }

  if (wallet?.profile.role !== 'Archangel') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 opacity-70 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
        <h2 className="text-2xl font-serif text-rose-500 font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 font-mono text-sm max-w-md">Your quantum identity lacks the required clearance. Only Archangels may enter the Vault.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
      <div className="bg-black/40 border border-[#d4af37]/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-50"></div>
        <h2 className="text-2xl font-serif text-[#d4af37] font-bold mb-6 flex items-center gap-3">
          <Shield className="w-6 h-6" /> Archangel Command Vault
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-5">
              <h3 className="text-white font-bold mb-4 font-mono text-sm uppercase tracking-widest text-[#d4af37]">Identity Forgeries</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-right">CHT Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{u.username}</div>
                          <div className="text-[10px] font-mono text-cyan-500/70 truncate w-32" title={u.address}>{u.address}</div>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded bg-black/50 border ${u.role === 'Archangel' ? 'border-[#d4af37] text-[#d4af37]' : u.role === 'Scholar' ? 'border-emerald-500 text-emerald-400' : 'border-cyan-500 text-cyan-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {u.balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-5">
              <h3 className="text-white font-bold mb-4 font-mono text-sm uppercase tracking-widest text-[#d4af37]">Adjust Ledger Balance</h3>
              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">Target Address</label>
                  <SearchableSelect 
                    value={targetAddress}
                    onChange={setTargetAddress}
                    options={users.map(u => ({ value: u.address, label: `${u.username} (${u.role})` }))}
                    placeholder="Select Target..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">Offset Amount (e.g. 50 or -50)</label>
                  <input 
                    type="number" 
                    value={amountOffset}
                    onChange={e => setAmountOffset(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm font-mono"
                  />
                </div>
                <button type="submit" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] py-2 rounded hover:bg-[#d4af37] hover:text-black transition-colors font-bold text-xs uppercase tracking-widest">
                  Execute Adjustment
                </button>
              </form>
            </div>

            <div className="bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-5">
              <h3 className="text-white font-bold mb-4 font-mono text-sm uppercase tracking-widest text-[#d4af37]">Assign Role</h3>
              <form onSubmit={handleAssignRole} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">Target Address</label>
                  <SearchableSelect 
                    value={roleTarget}
                    onChange={setRoleTarget}
                    options={users.map(u => ({ value: u.address, label: `${u.username} (${u.role})` }))}
                    placeholder="Select Target..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">New Role</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"
                  >
                    <option value="Initiate">Initiate</option>
                    <option value="Scholar">Scholar</option>
                    <option value="Archangel">Archangel</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] py-2 rounded hover:bg-[#d4af37] hover:text-black transition-colors font-bold text-xs uppercase tracking-widest">
                  Transmute Role
                </button>
              </form>
            </div>
          </div>

          <div className="bg-[#0a0f1a] border border-[#ffffff1a] rounded-lg p-5 flex flex-col h-full max-h-[800px]">
             <h3 className="text-white font-bold mb-4 font-mono text-sm uppercase tracking-widest text-rose-400 flex items-center gap-2">
               <Network className="w-4 h-4" /> Immutable Audit Logs
             </h3>

             <div className="flex flex-col gap-2 mb-4 bg-black/40 p-3 rounded-lg border border-white/5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-2 py-1.5 text-white text-xs font-mono"
                    placeholder="Search admin, target, or details..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 bg-black/40 border border-white/10 rounded px-2">
                    <Filter className="w-3 h-3 text-slate-500" />
                    <select 
                      className="bg-transparent py-1.5 text-white text-xs w-full focus:outline-none"
                      value={actionFilter}
                      onChange={e => setActionFilter(e.target.value)}
                    >
                      <option value="ALL">All Actions</option>
                      {Array.from(new Set(logs.map(l => l.action))).map(action => (
                        <option key={action as string} value={action as string}>{action as string}</option>
                      ))}
                    </select>
                  </div>
                  <select 
                    className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white text-xs flex-1"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                  >
                    <option value="ALL">All Time</option>
                    <option value="24H">Last 24 Hours</option>
                    <option value="7D">Last 7 Days</option>
                    <option value="30D">Last 30 Days</option>
                  </select>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-slate-500 py-10 font-mono text-sm">No vault actions found.</div>
                ) : (
                  filteredLogs.slice().reverse().map((log, i) => (
                    <div key={i} className="bg-black/30 border border-white/5 p-3 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">{log.action}</span>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono mb-1">
                        <span className="text-slate-500">Admin:</span> {log.adminAddress.slice(0, 16)}...
                      </div>
                      <div className="text-xs text-slate-300 font-mono mb-1">
                        <span className="text-slate-500">Target:</span> {log.targetAddress.slice(0, 16)}...
                      </div>
                      <div className="text-sm font-bold text-white mt-2 border-t border-white/5 pt-2">
                        {log.details}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
