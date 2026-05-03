import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LogIn, Search, LogOut, Download, ScanLine, 
  Edit, Trash2, ShieldCheck, UserCircle, History, PackagePlus, AlertCircle, Eye, CornerDownLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users
} from 'lucide-react';
import { PassportRecord, User, PassportStatus, PassportLog } from './types';
import { LoginScreen } from './LoginScreen';
import { UsersView } from './UsersView';
import { PasswordChangeModal } from './PasswordChangeModal';
import { CameraScanner } from './components/CameraScanner';
import { subscribeToRecords, addRecord, updateRecord, deleteRecord } from './services/records';

const STORAGE_KEY = 'passport_db_records';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function buildHistory(r: PassportRecord): PassportLog[] {
  if (r.history && r.history.length > 0) return r.history;
  const h: PassportLog[] = [{ id: generateId(), action: 'ENTRY', timestamp: r.entryTime, operator: r.operator }];
  if (r.exitTime) {
    h.push({ id: generateId(), action: 'CHECKOUT', timestamp: r.exitTime, operator: r.operator, borrowerName: r.borrowerName, borrowerSignature: r.borrowerSignature });
  }
  return h;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<PassportRecord[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'warm' | 'nature'>('light');
  const [activeTab, setActiveTab] = useState<'entry' | 'query' | 'users'>('entry');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Load initial data from Firestore
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToRecords((data) => {
        setRecords(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  const handleAddRecord = async (rec: PassportRecord) => {
    await addRecord(rec);
  };

  const handleUpdateRecord = async (id: string, updated: Partial<PassportRecord>) => {
    await updateRecord(id, updated);
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteRecord(id);
  };

  return (
    <div className="min-h-screen bg-primary text-main flex font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col p-6 transition-colors duration-300">
        <div className="mb-10 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-accent" />
          <div>
            <h1 className="font-sans text-3xl font-bold text-accent tracking-tight leading-tight">P.M.S</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1">护照出入库</p>
          </div>
        </div>
        <nav className="flex-1 space-y-4">
          <button
            onClick={() => setActiveTab('entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'entry' ? 'sidebar-link text-accent bg-primary' : 'sidebar-link opacity-70'}`}
          >
            <PackagePlus className="w-5 h-5 mx-0" />
            <span>扫码入库</span>
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'query' ? 'sidebar-link text-accent bg-primary' : 'sidebar-link opacity-70'}`}
          >
            <Search className="w-5 h-5 mx-0" />
            <span>证件一览</span>
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'users' ? 'sidebar-link text-accent bg-primary' : 'sidebar-link opacity-70'}`}
            >
              <Users className="w-5 h-5 mx-0" />
              <span>用户管理</span>
            </button>
          )}
        </nav>
        <div className="pt-6 border-t border-border mt-auto space-y-4">
          <div className="flex items-center justify-between text-xs">
             <span className="opacity-50 uppercase tracking-widest">系统主题</span>
             <select 
               value={theme}
               onChange={(e) => setTheme(e.target.value as any)}
               className="bg-transparent border border-border rounded px-2 py-1 text-main focus:outline-none focus:border-accent font-medium leading-none"
             >
               <option className="bg-surface" value="light">明亮清爽 (Light)</option>
               <option className="bg-surface" value="dark">黑色深邃 (Dark)</option>
               <option className="bg-surface" value="warm">质感高级 (Warm)</option>
               <option className="bg-surface" value="nature">自然绿意 (Nature)</option>
             </select>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">

            <div 
              className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs uppercase cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowPasswordModal(true)}
              title="修改密码"
            >
              {user.username.slice(0, 2)}
            </div>
            <div className="flex-1 text-xs">
              <span className="font-medium text-main block">{user.username}</span>
              <span className="opacity-50 italic block mt-0.5">{user.role === 'admin' ? '系统管理员' : '录入员'}</span>
            </div>
            <button onClick={() => setUser(null)} className="opacity-70 hover:opacity-100 hover:text-accent transition-colors" title="退出登录">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-primary text-main transition-colors duration-300">
        {activeTab === 'entry' && (
          <EntryView 
            currentUser={user} 
            records={records}
            onAdd={handleAddRecord} 
            onUpdate={handleUpdateRecord}
          />
        )}
        {activeTab === 'query' && (
          <QueryView 
            records={records} 
            currentUser={user}
            onUpdate={handleUpdateRecord}
            onDelete={handleDeleteRecord}
          />
        )}
        {activeTab === 'users' && (
          <UsersView currentUser={user} />
        )}
      </main>

      {showPasswordModal && (
        <PasswordChangeModal currentUser={user} onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

// ==================== [ Entry View ] ====================
function EntryView({ currentUser, records, onAdd, onUpdate }: { 
  currentUser: User, 
  records: PassportRecord[],
  onAdd: (r: PassportRecord) => void,
  onUpdate: (id: string, updated: Partial<PassportRecord>) => void
}) {
  const [formData, setFormData] = useState({
    passportId: '', name: '', country: '', nationality: '', dob: '', sex: '', expiryDate: ''
  });
  const [toast, setToast] = useState('');
  const [systemLog, setSystemLog] = useState('');

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [systemLog]);

  const appendLog = (msg: string) => {
    setSystemLog(prev => {
      const timestamp = new Date().toLocaleTimeString();
      const newEntry = `[📢 ${timestamp}] ${msg}`;
      return prev ? `${prev}\n\n${newEntry}` : newEntry;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.passportId || !formData.name) return;

    const existingRecord = records.find(r => r.passportId === formData.passportId);
    if (existingRecord) {
      if (existingRecord.status === 'CHECKED_OUT') {
         const newLogs = buildHistory(existingRecord);
         onUpdate(existingRecord.id, {
            status: 'IN_VAULT',
            history: [...newLogs, {
              id: generateId(),
              action: 'RETURN',
              timestamp: new Date().toISOString(),
              operator: currentUser.username
            }]
         });
         const msg = `✅ 归还成功！该证件 (${existingRecord.name}) 已成功入库。`;
         setToast(msg);
         appendLog(msg);
      } else {
         const msg = `⚠️ 该证件 (${existingRecord.name}) 已经在库中，系统无需重复录入！`;
         setToast(msg);
         appendLog(msg);
      }
      setTimeout(() => setToast(''), 4000);
      setFormData({ passportId: '', name: '', country: '', nationality: '', dob: '', sex: '', expiryDate: '' });
      return;
    }

    const entryLog: PassportLog = {
      id: generateId(),
      action: 'ENTRY',
      timestamp: new Date().toISOString(),
      operator: currentUser.username
    };

    const newRecord: PassportRecord = {
      id: generateId(),
      passportId: formData.passportId,
      name: formData.name,
      country: formData.country,
      nationality: formData.nationality,
      dob: formData.dob,
      sex: formData.sex,
      expiryDate: formData.expiryDate,
      entryTime: new Date().toISOString(),
      status: 'IN_VAULT',
      operator: currentUser.username,
      history: [entryLog]
    };
    onAdd(newRecord);
    
    const msg = `✅ 首次入库登记成功！\n入库证件: ${formData.passportId} (${formData.name})`;
    setToast('✅ 首次入库登记成功！');
    appendLog(msg);
    setTimeout(() => setToast(''), 3000);
    setFormData({ passportId: '', name: '', country: '', nationality: '', dob: '', sex: '', expiryDate: '' });
  };

  return (
    <div className="flex-1 overflow-auto p-8 relative font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-sans text-3xl text-main">登记入库</h2>
            <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Inbound Registry - Op: {currentUser.username}</p>
          </div>
          {toast && <div className="bg-accent-muted text-accent border border-blue-300 px-3 py-1.5 rounded text-xs font-medium animate-pulse">{toast}</div>}
        </header>

        <div className="glass-panel rounded-xl overflow-hidden mb-6">
          {/* Scan Section */}
          <div className="p-6 border-b border-border relative bg-primary">
            <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-4">护照 MRZ 摄像头智能识别</label>
            <CameraScanner 
              onScanStart={() => {
                const timestamp = new Date().toLocaleTimeString();
                setSystemLog(prev => {
                  const newEntry = `[⏳ ${timestamp}] 正在识别...`;
                  return prev ? `${prev}\n\n${newEntry}` : newEntry;
                });
              }}
              onRecognize={(data, logText) => {
                setFormData(prev => ({
                  ...prev, 
                  passportId: data.passportId || prev.passportId,
                  name: data.name || prev.name,
                  country: data.country || prev.country,
                  nationality: data.nationality || prev.nationality,
                  dob: data.dob || prev.dob,
                  sex: data.sex || prev.sex,
                  expiryDate: data.expiryDate || prev.expiryDate
                }));
                setToast('✅ 识别成功！请核对信息。');
                if (logText) {
                  const timestamp = new Date().toLocaleTimeString();
                  setSystemLog(prev => `${prev}\n\n[✨ ${timestamp}] 读取完成\n${logText}`);
                }
                setTimeout(() => setToast(''), 3000);
              }}
              onScanError={(err, logText) => {
                setToast('❌ 识别失败: ' + err);
                if (logText) {
                  const timestamp = new Date().toLocaleTimeString();
                  setSystemLog(prev => `${prev}\n\n[❌ ${timestamp}] 读取失败\n${logText}`);
                }
                setTimeout(() => setToast(''), 4000);
              }}
            />
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">护照号码 <span className="text-accent">*</span></label>
                <input required type="text" value={formData.passportId} onChange={e => setFormData({...formData, passportId: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">姓名 (拼音或全名) <span className="text-accent">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors" />
              </div>
              
              <div className="col-span-2 grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">国籍 (Nationality)</label>
                  <input type="text" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">签发国 (Issuing Country)</label>
                  <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">性别 (Sex)</label>
                  <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent">
                    <option value="">-</option>
                    <option value="M">男 (M)</option>
                    <option value="F">女 (F)</option>
                    <option value="X">其他 (X)</option>
                  </select>
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">出生年月</label>
                  <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">失效日期</label>
                  <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>

            <div className="pt-6 mt-2 flex justify-end">
              <button type="submit" className="bg-accent text-white hover:opacity-90 text-white font-semibold px-8 py-2 rounded transition-all text-sm">
                确认入库
              </button>
            </div>
          </form>
        </div>

        {systemLog && (
          <div className="glass-panel w-full rounded-xl p-4 mt-6 h-64 overflow-y-auto border border-border shadow-md">
            <h3 className="text-[10px] uppercase tracking-wider opacity-60 mb-2 font-semibold">识别诊断日志</h3>
            <pre className="text-[11px] text-main whitespace-pre-wrap font-mono leading-relaxed">{systemLog}</pre>
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== [ Signature Pad ] ====================
function SignaturePad({ onReady }: { onReady: (signature: string | null) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    onReady(canvas.toDataURL());
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onReady(null);
  };

  return (
    <div className="relative border border-border bg-surface border-border-strong shadow-sm rounded-lg overflow-hidden flex flex-col">
       <canvas 
         ref={canvasRef}
         width={400}
         height={160}
         onMouseDown={startDraw}
         onMouseMove={draw}
         onMouseUp={endDraw}
         onMouseLeave={endDraw}
         onTouchStart={startDraw}
         onTouchMove={draw}
         onTouchEnd={endDraw}
         className="w-full h-[160px] cursor-crosshair touch-none bg-transparent"
       />
       <button type="button" onClick={clear} className="absolute bottom-2 right-2 px-3 py-1.5 bg-surface-hover hover:bg-surface-hover text-main text-[10px] uppercase tracking-widest rounded transition-colors font-semibold z-10">清除重签</button>
    </div>
  );
}

// ==================== [ Query View ] ====================
function QueryView({ records, currentUser, onUpdate, onDelete }: { 
  records: PassportRecord[], 
  currentUser: User,
  onUpdate: (id: string, updated: Partial<PassportRecord>) => void,
  onDelete: (id: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PassportStatus | 'ALL'>('ALL');
  
  // Checkout State
  const [checkingOutRecord, setCheckingOutRecord] = useState<PassportRecord | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  // Edit State
  const [editingRecord, setEditingRecord] = useState<PassportRecord | null>(null);

  // View Details State
  const [viewingRecord, setViewingRecord] = useState<PassportRecord | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  type SortField = 'seq' | 'status' | 'expiryDate' | 'entryTime' | 'operator';
  const [sortField, setSortField] = useState<SortField>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortOrder]);

  const globalSeqMap = useMemo(() => {
    const sorted = [...records].sort((a,b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
    const m = new Map<string, number>();
    sorted.forEach((rec, idx) => m.set(rec.id, idx + 1));
    return m;
  }, [records]);

  const filteredRecords = useMemo(() => {
    const filtered = records.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.passportId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'seq': {
          const seqA = globalSeqMap.get(a.id) || 0;
          const seqB = globalSeqMap.get(b.id) || 0;
          comparison = seqA - seqB;
          break;
        }
        case 'entryTime': {
          const timeA = new Date(a.entryTime).getTime();
          const timeB = new Date(b.entryTime).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'expiryDate': {
          const tA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          const tB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          comparison = tA - tB;
          break;
        }
        case 'operator':
          comparison = (a.operator || '').localeCompare(b.operator || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, searchTerm, statusFilter, sortField, sortOrder, globalSeqMap]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleCheckoutClick = (record: PassportRecord) => {
    setCheckingOutRecord(record);
    setBorrowerName('');
    setSignature(null);
  };

  const confirmCheckout = () => {
    if (!borrowerName.trim() || !signature) return;
    const now = new Date().toISOString();
    const newLogs = buildHistory(checkingOutRecord!);
    onUpdate(checkingOutRecord!.id, { 
      status: 'CHECKED_OUT', 
      exitTime: now,
      borrowerName: borrowerName.trim(),
      borrowerSignature: signature,
      history: [...newLogs, {
         id: generateId(),
         action: 'CHECKOUT',
         timestamp: now,
         operator: currentUser.username,
         borrowerName: borrowerName.trim(),
         borrowerSignature: signature
      }]
    });
    setCheckingOutRecord(null);
  };

  const confirmReturn = (record: PassportRecord) => {
    if (window.confirm('确认已收到该证件并标记为归还入库？')) {
       const newLogs = buildHistory(record);
       onUpdate(record.id, {
          status: 'IN_VAULT',
          history: [...newLogs, {
            id: generateId(),
            action: 'RETURN',
            timestamp: new Date().toISOString(),
            operator: currentUser.username
          }]
       });
    }
  };

  const exportCSV = () => {
    const headers = ['序号', '证件号', '姓名', '当前状态', '入库时间', '出库时间', '经办人', '借出人', '签发日期', '失效日期'];
    const rows = filteredRecords.map(r => [
      globalSeqMap.get(r.id) || 0,
      r.passportId,
      r.name,
      r.status === 'IN_VAULT' ? '在库' : '已出库',
      new Date(r.entryTime).toLocaleString(),
      r.exitTime ? new Date(r.exitTime).toLocaleString() : '-',
      r.operator,
      r.borrowerName || '-',
      r.issueDate,
      r.expiryDate
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `护照记录_${new Date().getTime()}.csv`;
    link.click();
  };

  const inVaultCount = records.filter(r => r.status === 'IN_VAULT').length;
  const checkedOutCount = records.filter(r => r.status === 'CHECKED_OUT').length;
  const totalCount = records.length;

  return (
    <div className="flex-1 flex flex-col p-8 bg-primary text-main overflow-hidden font-sans">
      {/* Filters Head */}
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h2 className="font-sans text-3xl text-main">证件一览</h2>
          <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Inventory Overview & Statistics</p>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary border border-border flex items-center justify-center">
             <PackagePlus className="w-5 h-5 text-muted" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">总记录数</div>
            <div className="text-2xl font-medium text-main">{totalCount}</div>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4 border-l-2 border-l-accent">
          <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent-muted flex items-center justify-center">
             <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">当前在库</div>
            <div className="text-2xl font-medium text-accent">{inVaultCount}</div>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4 border-l-2 border-l-blue-400/50">
          <div className="w-12 h-12 rounded-full bg-primary border border-border flex items-center justify-center">
             <LogOut className="w-5 h-5 text-muted" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">待归还 (已出库)</div>
            <div className="text-2xl font-medium text-main/80">{checkedOutCount}</div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel rounded-xl p-6 mb-6 shrink-0">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] uppercase tracking-wider opacity-60">搜索证件号或姓名</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 text-main" />
              <input 
                type="text" 
                placeholder="模糊查询..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded pl-9 pr-3 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider opacity-60">状态分类</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent appearance-none transition-colors"
            >
              <option className="bg-surface" value="ALL">所有状态</option>
              <option className="bg-surface" value="IN_VAULT">在库中</option>
              <option className="bg-surface" value="CHECKED_OUT">已出库</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={exportCSV} className="w-full py-2 bg-surface-hover hover:bg-surface-hover border border-border text-main rounded text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              <span>执行报表导出</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Replacement (List view) */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center mb-3 text-[10px] uppercase tracking-widest opacity-40 px-4 font-bold shrink-0">
          <div 
            className="w-12 mr-6 shrink-0 flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity"
            onClick={() => {
              if (sortField === 'seq') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortField('seq'); setSortOrder('asc'); }
            }}
          >
            序号
            {sortField === 'seq' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
          </div>
          <div className="flex-1 grid grid-cols-[1.2fr_1fr_1fr_1.2fr_1fr_100px] gap-4 text-center">
            <div className="flex items-center justify-center">证件信息</div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity"
              onClick={() => {
                if (sortField === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('status'); setSortOrder('asc'); }
              }}
            >
              当前状态
              {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)}
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity"
              onClick={() => {
                if (sortField === 'expiryDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('expiryDate'); setSortOrder('asc'); }
              }}
            >
              有效日期
              {sortField === 'expiryDate' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)}
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity"
              onClick={() => {
                if (sortField === 'entryTime') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('entryTime'); setSortOrder('asc'); }
              }}
            >
              入库时间
              {sortField === 'entryTime' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)}
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity"
              onClick={() => {
                if (sortField === 'operator') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('operator'); setSortOrder('asc'); }
              }}
            >
              经办人
              {sortField === 'operator' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)}
            </div>
            <div className="flex items-center justify-center">操作</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {paginatedRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-light">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">没有找到匹配的记录</p>
              </div>
            ) : paginatedRecords.map(r => (
              <div key={r.id} className={`glass-panel rounded-lg py-2.5 px-4 flex items-center transition-all hover:bg-primary ${r.status === 'IN_VAULT' ? 'border-l-2 border-l-accent' : 'opacity-60'}`}>
                <div className="w-12 flex items-center justify-center mr-6 shrink-0">
                  <span className={`font-medium text-sm ${r.status === 'IN_VAULT' ? 'text-accent opacity-80' : 'text-gray-400'}`}>
                    {globalSeqMap.get(r.id) || 0}
                  </span>
                </div>
                
                <div className="flex-1 grid grid-cols-[1.2fr_1fr_1fr_1.2fr_1fr_100px] items-center gap-4 text-sm text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="font-medium text-main mb-0.5 tracking-wider">{r.passportId}</div>
                    <div className="text-xs font-semibold text-muted">{r.name}</div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    {r.status === 'IN_VAULT' ? (
                      <span className="inline-flex items-center justify-center py-1 text-sm font-bold text-accent tracking-widest">在库</span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded text-sm font-bold bg-primary text-muted-light border border-border tracking-widest">已出库</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center text-xs text-muted space-y-0.5">
                    <div>出生: {r.dob || '-'}</div>
                    <div>失效: {r.expiryDate || '-'}</div>
                  </div>

                  <div className="flex items-center justify-center text-xs font-medium text-muted">
                    {new Date(r.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>

                  <div className="text-sm font-medium text-main/80 flex items-center justify-center gap-1.5 opacity-90">
                    <UserCircle className="w-4 h-4 opacity-40 shrink-0" />
                    <span className="truncate">{r.operator}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    {r.status === 'IN_VAULT' && (
                      <button onClick={() => handleCheckoutClick(r)} className="text-accent hover:text-main p-1 rounded transition-colors" title="登记出库">
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                    {r.status === 'CHECKED_OUT' && (
                      <button onClick={() => confirmReturn(r)} className="text-accent hover:text-blue-300 p-1 rounded transition-colors" title="归还入库">
                        <CornerDownLeft className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setViewingRecord(r)} className="text-muted-light hover:text-main p-1 rounded transition-colors" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingRecord(r)} className="text-muted-light hover:text-main p-1 rounded transition-colors" title="编辑信息">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(window.confirm('确定彻底删除该记录吗？')) onDelete(r.id); }} className="text-muted-light hover:text-red-400 p-1 rounded transition-colors" title="删除记录">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border shrink-0 px-4 mb-2">
            <div className="text-[10px] uppercase tracking-widest opacity-50">
              共 {filteredRecords.length} 条记录 (第 {currentPage}/{totalPages} 页)
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-primary border border-border text-main disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded bg-primary border border-border text-main disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-6 flex justify-between items-center text-[10px] opacity-40 uppercase tracking-widest font-medium border-t border-border pt-4 shrink-0">
        <div>Powered by SecureRegistry v4.1.2</div>
        <div className="flex gap-6">
          <span>服务器状态: 正常</span>
        </div>
      </footer>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-main/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-main">
            <div className="p-6 border-b border-border">
              <h3 className="font-sans text-xl font-bold text-main">编辑证件信息</h3>
               <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Edit Record - {editingRecord.passportId}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">证件号码</label>
                <input type="text" value={editingRecord.passportId} onChange={e => setEditingRecord({...editingRecord, passportId: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">姓名</label>
                <input type="text" value={editingRecord.name} onChange={e => setEditingRecord({...editingRecord, name: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">国籍</label>
                  <input type="text" value={editingRecord.nationality || ''} onChange={e => setEditingRecord({...editingRecord, nationality: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">签发国</label>
                  <input type="text" value={editingRecord.country || ''} onChange={e => setEditingRecord({...editingRecord, country: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">性别</label>
                  <select value={editingRecord.sex || ''} onChange={e => setEditingRecord({...editingRecord, sex: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent">
                    <option value="">-</option>
                    <option value="M">男 (M)</option>
                    <option value="F">女 (F)</option>
                    <option value="X">其他 (X)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">出生年月</label>
                  <input type="date" value={editingRecord.dob || ''} onChange={e => setEditingRecord({...editingRecord, dob: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent " />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">失效日期</label>
                  <input type="date" value={editingRecord.expiryDate} onChange={e => setEditingRecord({...editingRecord, expiryDate: e.target.value})} className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent " />
                </div>
              </div>
            </div>
            <div className="p-6 bg-primary border-t border-border flex justify-end gap-3">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 font-medium text-muted hover:text-main transition-colors text-sm">取消</button>
              <button 
                onClick={() => {
                  onUpdate(editingRecord.id, editingRecord);
                  setEditingRecord(null);
                }} 
                className="bg-accent text-white hover:opacity-90 text-white px-6 py-2 rounded font-semibold transition-all text-sm"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-main/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-main">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="font-sans text-xl font-bold text-main">证件详情</h3>
                <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Record Details - {viewingRecord.passportId}</p>
              </div>
              <div className="text-right">
                {viewingRecord.status === 'IN_VAULT' 
                  ? <span className="inline-flex py-1 px-2.5 rounded text-[10px] font-bold bg-accent-muted text-accent border border-blue-300 tracking-widest">在库中</span>
                  : <span className="inline-flex py-1 px-2.5 rounded text-[10px] font-bold bg-primary text-muted-light border border-border tracking-widest">已出库</span>
                }
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Profile info */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm bg-primary p-4 rounded-lg border border-border">
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">姓名</div>
                  <div className="font-medium text-main">{viewingRecord.name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">证件号码</div>
                  <div className="font-medium text-main tracking-wider">{viewingRecord.passportId}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">国籍</div>
                  <div className="font-medium text-main">{viewingRecord.nationality || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">签发国</div>
                  <div className="font-medium text-main">{viewingRecord.country || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">性别</div>
                  <div className="font-medium text-main">{viewingRecord.sex === 'M' ? '男 (M)' : viewingRecord.sex === 'F' ? '女 (F)' : viewingRecord.sex || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">出生日期</div>
                  <div className="font-medium text-main">{viewingRecord.dob || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">失效日期</div>
                  <div className="text-main/80">{viewingRecord.expiryDate || '-'}</div>
                </div>
              </div>

              {/* History sequence */}
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-50 mb-3 flex items-center gap-2">
                  <History className="w-3 h-3" />
                  <span>流转记录 ({buildHistory(viewingRecord).length})</span>
                </div>
                
                <div className="space-y-4 pl-2 border-l border-border relative max-h-[300px] overflow-y-auto custom-scrollbar">
                  {buildHistory(viewingRecord).map((log, i, arr) => (
                    <div key={log.id} className="relative pl-6 pb-2">
                       <div className={`absolute left-[-5px] top-1.5 w-2 h-2 rounded-full border border-white ${
                         log.action === 'ENTRY' ? 'bg-green-500' :
                         log.action === 'RETURN' ? 'bg-blue-400' : 'bg-gray-400'
                       }`}></div>
                       <div className="text-xs text-muted mb-0.5">{new Date(log.timestamp).toLocaleString()}</div>
                       <div className="text-sm text-main flex flex-col gap-1">
                          {log.action === 'ENTRY' && <div>入库登记 <span className="text-muted text-xs ml-2">经办人: {log.operator}</span></div>}
                          {log.action === 'RETURN' && <div className="text-accent">归还入库 <span className="text-muted text-xs ml-2">经办人: {log.operator}</span></div>}
                          {log.action === 'CHECKOUT' && <div>办理出库 <span className="text-muted text-xs ml-2">借出人: {log.borrowerName}</span> <span className="text-muted-light text-[10px] ml-2">经办人: {log.operator}</span></div>}
                       </div>
                       
                       {log.action === 'CHECKOUT' && log.borrowerSignature && (
                          <div className="mt-2 bg-surface border-border-strong shadow-sm rounded-lg border border-border p-2 overflow-hidden w-fit">
                            <div className="text-[10px] opacity-40 mb-1 mx-2">借出人签字记录</div>
                            <img src={log.borrowerSignature} alt="Signature" className="h-16 max-w-full" />
                          </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-primary border-t border-border flex justify-end">
              <button 
                onClick={() => setViewingRecord(null)} 
                className="px-6 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-main rounded font-medium transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkingOutRecord && (
        <div className="fixed inset-0 bg-main/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-main">
            <div className="p-6 border-b border-border">
              <h3 className="font-sans text-xl font-bold text-main">办理出库</h3>
              <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Check Out & Sign</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-primary p-4 rounded-lg border border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">即将出库证件</div>
                  <div className="font-medium text-main tracking-wider">{checkingOutRecord.passportId}</div>
                  <div className="text-xs text-muted">{checkingOutRecord.name}</div>
                </div>
                <ShieldCheck className="w-8 h-8 opacity-20" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5 flex justify-between">
                  <span>当前经办人 (系统账户)</span>
                </label>
                <div className="w-full bg-primary border border-border rounded px-3 py-2 text-sm text-muted flex items-center gap-2 cursor-not-allowed">
                  <UserCircle className="w-4 h-4 opacity-50" />
                  {currentUser.username}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5 flex justify-between">
                  <span>借出人姓名 <span className="text-accent">*</span></span>
                </label>
                <input 
                  type="text" 
                  value={borrowerName} 
                  onChange={e => setBorrowerName(e.target.value)} 
                  placeholder="如: 张三"
                  className="w-full bg-surface border-border shadow-sm rounded px-3 py-2 text-sm text-main focus:outline-none focus:border-accent" 
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1.5">
                  借出人签字 (请在下方触摸屏/手写板区域签字) <span className="text-accent">*</span>
                </label>
                <SignaturePad onReady={setSignature} />
              </div>
            </div>
            <div className="p-6 bg-primary border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setCheckingOutRecord(null)} 
                className="px-4 py-2 font-medium text-muted hover:text-main transition-colors text-sm"
              >
                取消
              </button>
              <button 
                onClick={confirmCheckout}
                disabled={!borrowerName.trim() || !signature}
                className="bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 text-white px-6 py-2 rounded font-semibold transition-all text-sm"
              >
                确认出库并保存签字
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

