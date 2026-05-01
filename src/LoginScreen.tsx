import React, { useState } from 'react';
import { LogIn, ShieldCheck, UserPlus, ArrowLeft } from 'lucide-react';
import { User } from './types';
import { loginUser, registerUser } from './users';

export function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const user = await loginUser(username, password);
      onLogin(user);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!username.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg('请填写所有必填字段');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致');
      return;
    }
    try {
      await registerUser({
        username: username.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        role: 'staff' // default role is staff for public registration
      });
      setSuccessMsg('注册申请已提交，请等待管理员审批！');
      setIsRegister(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-primary font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary z-0" />
      <div className="glass-panel p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] max-w-sm w-full z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-accent-muted border border-accent-muted text-accent rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sans font-bold text-main tracking-tight">P.M.S 入口</h1>
          <p className="text-muted text-[10px] uppercase tracking-widest mt-2">Security Registry</p>
        </div>

        {errorMsg && <div className="mb-4 text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded text-center">{errorMsg}</div>}
        {successMsg && <div className="mb-4 text-xs font-medium text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded text-center">{successMsg}</div>}

        {!isRegister ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">姓名 / 用户名</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <button type="submit" className="w-full bg-accent text-white hover:opacity-90 font-semibold text-white px-4 py-2.5 rounded transition-all flex items-center justify-center gap-2 mt-6 mb-2">
              <LogIn className="w-4 h-4" />
              进入系统
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs text-accent hover:underline">
                没有账号？立即注册
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">真实姓名 / 用户名 *</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">手机号 *</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">电子邮箱 *</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">密码 *</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5">确认密码 *</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-surface border-border shadow-sm rounded px-4 py-2 text-sm text-main focus:outline-none focus:border-accent transition-colors"
                required 
              />
            </div>
            <button type="submit" className="w-full bg-accent text-white hover:opacity-90 font-semibold text-white px-4 py-2.5 rounded transition-all flex items-center justify-center gap-2 mt-6 mb-2">
              <UserPlus className="w-4 h-4" />
              注册申请
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg(''); }} className="text-xs text-muted hover:text-main flex items-center justify-center gap-1 mx-auto">
                <ArrowLeft className="w-3 h-3" /> 返回登录
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
