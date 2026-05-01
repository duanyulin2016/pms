import React, { useState, useEffect } from 'react';
import { User, UserActionLog } from './types';
import { getUsers, updateUser, deleteUser, getLogs, addLog } from './users';
import { Trash2, UserCog, KeyRound, List, History, ShieldCheck } from 'lucide-react';

export function UsersView({ currentUser }: { currentUser: User }) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs'>('users');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [logsList, setLogsList] = useState<UserActionLog[]>([]);
  const [toast, setToast] = useState('');
  
  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'DELETE' | 'RESET';
    targetId: string;
    targetName: string;
  }>({ show: false, type: 'DELETE', targetId: '', targetName: '' });

  const loadData = async () => {
    const users = await getUsers();
    const logs = await getLogs();
    setUsersList(users);
    setLogsList(logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (id: string, newRole: 'admin' | 'staff') => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;

    if (id === currentUser.id && newRole !== 'admin') {
      showToast('❌ 无法取消自己的管理员权限！');
      return;
    }
    await updateUser(id, { role: newRole });
    await addLog({
      operatorId: currentUser.id,
      operatorName: currentUser.username,
      targetUserId: targetUser.id,
      targetUserName: targetUser.username,
      action: 'ROLE_CHANGE',
      details: `修改角色为: ${newRole === 'admin' ? '管理员' : '录入员'}`
    });
    loadData();
    showToast('✅ 角色修改成功');
  };

  const executeDelete = async (id: string) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;

    await deleteUser(id);
    await addLog({
      operatorId: currentUser.id,
      operatorName: currentUser.username,
      targetUserId: targetUser.id,
      targetUserName: targetUser.username,
      action: 'USER_DELETE',
      details: `删除用户账号`
    });
    loadData();
    showToast('✅ 用户已删除');
    setConfirmModal({ ...confirmModal, show: false });
  };

  const executeReset = async (id: string) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;

    await updateUser(id, { password: '123456' });
    await addLog({
      operatorId: currentUser.id,
      operatorName: currentUser.username,
      targetUserId: targetUser.id,
      targetUserName: targetUser.username,
      action: 'PASSWORD_RESET',
      details: `重置密码为默认值`
    });
    loadData();
    showToast('✅ 密码已重置为 123456');
    setConfirmModal({ ...confirmModal, show: false });
  };

  const handleDeleteClick = (id: string) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;

    if (id === currentUser.id) {
        showToast('❌ 无法删除自己！');
        return;
    }
    setConfirmModal({
      show: true,
      type: 'DELETE',
      targetId: id,
      targetName: targetUser.username
    });
  };

  const handleResetClick = (id: string) => {
      const targetUser = usersList.find(u => u.id === id);
      if (!targetUser) return;

      setConfirmModal({
        show: true,
        type: 'RESET',
        targetId: id,
        targetName: targetUser.username
      });
  };

  const handleApprove = async (id: string) => {
      const targetUser = usersList.find(u => u.id === id);
      if (!targetUser) return;

      await updateUser(id, { status: 'approved' });
      await addLog({
        operatorId: currentUser.id,
        operatorName: currentUser.username,
        targetUserId: targetUser.id,
        targetUserName: targetUser.username,
        action: 'USER_APPROVE',
        details: `审批通过用户注册申请`
      });
      loadData();
      showToast('✅ 用户审批通过');
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  if (currentUser.role !== 'admin') {
      return (
          <div className="flex-1 flex items-center justify-center p-8 bg-primary text-main">
              <div className="text-center opacity-50">
                  <p>抱歉，只有管理员可以访问用户管理</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col p-8 bg-primary text-main overflow-hidden font-sans">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <header className="flex justify-between items-end mb-8 shrink-0">
          <div>
            <h2 className="font-sans text-3xl text-main">用户管理</h2>
            <div className="flex items-center gap-4 mt-2">
               <button 
                 onClick={() => setActiveSubTab('users')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubTab === 'users' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-hover text-muted'}`}
               >
                 <List className="w-3.5 h-3.5" />
                 用户列表
               </button>
               <button 
                 onClick={() => setActiveSubTab('logs')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubTab === 'logs' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-hover text-muted'}`}
               >
                 <History className="w-3.5 h-3.5" />
                 操作日志
               </button>
            </div>
          </div>
          {toast && <div className="bg-accent-muted text-accent border border-blue-300 px-3 py-1.5 rounded text-xs font-medium animate-pulse">{toast}</div>}
        </header>

        {activeSubTab === 'users' ? (
          <div className="glass-panel rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 border-border">
            <div className="p-4 border-b border-border bg-surface-hover shrink-0 flex text-xs font-medium text-muted-light tracking-widest uppercase">
               <div className="flex-1 grid grid-cols-[1fr_1fr_1fr_80px_100px_100px] gap-4 text-center">
                  <div className="flex items-center justify-center">姓名 / 用户名</div>
                  <div className="flex items-center justify-center">手机号</div>
                  <div className="flex items-center justify-center">邮箱</div>
                  <div className="flex items-center justify-center">状态</div>
                  <div className="flex items-center justify-center">角色</div>
                  <div className="flex items-center justify-center">操作</div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 p-2 custom-scrollbar">
                {usersList.map(u => (
                    <div key={u.id} className="glass-panel rounded-lg py-3 px-4 flex items-center transition-all hover:bg-primary">
                        <div className="flex-1 grid grid-cols-[1fr_1fr_1fr_80px_100px_100px] items-center gap-4 text-sm text-center">
                            <div className="font-medium text-main">{u.username}</div>
                            <div className="text-muted">{u.phone}</div>
                            <div className="text-muted">{u.email}</div>
                            
                            <div className="flex items-center justify-center">
                                {u.status === 'pending' ? (
                                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">待审批</span>
                                ) : (
                                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">已通过</span>
                                )}
                            </div>

                            <div className="flex items-center justify-center">
                                <select 
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                                  className="bg-surface border border-border text-main text-xs rounded px-2 py-1 focus:outline-none focus:border-accent"
                                >
                                    <option value="admin">管理员</option>
                                    <option value="staff">录入员</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                {u.status === 'pending' && (
                                    <button onClick={() => handleApprove(u.id)} className="text-xs bg-accent text-white px-2 py-1 rounded hover:opacity-90">
                                        通过
                                    </button>
                                )}
                                <button onClick={() => handleResetClick(u.id)} className="text-muted hover:text-accent p-1 rounded transition-colors" title="重置密码">
                                    <KeyRound className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteClick(u.id)} className="text-red-400 hover:text-red-300 p-1 rounded transition-colors" title="删除用户" disabled={u.id === currentUser.id}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 border-border">
             <div className="p-4 border-b border-border bg-surface-hover shrink-0 flex text-xs font-medium text-muted-light tracking-widest uppercase">
               <div className="flex-1 grid grid-cols-[160px_100px_100px_140px_1fr] gap-4 text-center">
                  <div className="flex items-center justify-center">时间</div>
                  <div className="flex items-center justify-center">操作人</div>
                  <div className="flex items-center justify-center">目标用户</div>
                  <div className="flex items-center justify-center">操作类型</div>
                  <div className="flex items-center justify-center">详情</div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 p-2 custom-scrollbar">
               {logsList.length === 0 ? (
                 <div className="text-center py-20 opacity-30 text-sm italic">暂无操作日志</div>
               ) : (
                 logsList.map(log => (
                   <div key={log.id} className="border-b border-border/30 last:border-0 py-3 px-4 flex items-center transition-all hover:bg-surface-hover/50 rounded-md">
                      <div className="flex-1 grid grid-cols-[160px_100px_100px_140px_1fr] items-center gap-4 text-xs text-center font-mono">
                        <div className="text-muted tabular-nums">{new Date(log.timestamp).toLocaleString()}</div>
                        <div className="text-main font-bold">{log.operatorName}</div>
                        <div className="text-main font-bold">{log.targetUserName}</div>
                        <div className="flex justify-center">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                             log.action === 'USER_DELETE' ? 'bg-red-500/10 text-red-500' :
                             log.action === 'PASSWORD_RESET' ? 'bg-yellow-500/10 text-yellow-500' :
                             log.action === 'USER_APPROVE' ? 'bg-green-500/10 text-green-500' :
                             'bg-blue-500/10 text-blue-500'
                           }`}>
                             {log.action === 'ROLE_CHANGE' ? '角色变更' :
                              log.action === 'PASSWORD_RESET' ? '重置密码' :
                              log.action === 'USER_DELETE' ? '删除用户' :
                              log.action === 'USER_APPROVE' ? '审批通过' : log.action}
                           </span>
                        </div>
                        <div className="text-muted text-left pl-4 font-sans">{log.details}</div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-main/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="glass-panel border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-main p-6">
            <h3 className="text-xl font-bold mb-2">
              {confirmModal.type === 'DELETE' ? '确认删除' : '确认重置'}
            </h3>
            <p className="text-sm text-muted mb-6">
              您确定要{confirmModal.type === 'DELETE' ? '彻底删除' : '重置'}用户 <span className="font-bold text-main">{confirmModal.targetName}</span> 的{confirmModal.type === 'DELETE' ? '账号' : '密码'}吗？
              {confirmModal.type === 'RESET' && <span className="block mt-1">重置后的默认密码为: <code className="bg-surface px-1.5 py-0.5 rounded">123456</code></span>}
              {confirmModal.type === 'DELETE' && <span className="block mt-1 text-red-400 font-bold">此操作不可恢复！</span>}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="px-4 py-2 rounded text-sm text-muted hover:text-main transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => confirmModal.type === 'DELETE' ? executeDelete(confirmModal.targetId) : executeReset(confirmModal.targetId)}
                className={`px-6 py-2 rounded text-sm font-bold text-white transition-all ${confirmModal.type === 'DELETE' ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:opacity-90'}`}
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
