import React, { useState } from 'react';
import { User } from './types';
import { updateUser } from './users';

export function PasswordChangeModal({ currentUser, onClose }: { currentUser: User, onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword || !confirmPassword) {
          setErrorMsg('请填写密码');
          return;
      }
      if (newPassword !== confirmPassword) {
          setErrorMsg('两次输入的密码不一致');
          return;
      }
      await updateUser(currentUser.id, { password: newPassword });
      window.alert('✅ 密码修改成功，请下次使用新密码登录');
      onClose();
  };

  return (
        <div className="fixed inset-0 bg-main/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-main">
            <div className="p-6 border-b border-border">
              <h3 className="font-sans text-xl font-bold text-main">修改密码</h3>
              <p className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Change Password</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               {errorMsg && <div className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded text-center">{errorMsg}</div>}
               <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">新密码 *</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                    required 
                  />
               </div>
               <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">确认新密码 *</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                    required 
                  />
               </div>
               <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm text-muted hover:text-main transition-colors">
                    取消
                  </button>
                  <button type="submit" className="bg-accent text-white px-4 py-2 rounded text-sm font-semibold hover:opacity-90 transition-all">
                    保存修改
                  </button>
               </div>
            </form>
          </div>
        </div>
  );
}
