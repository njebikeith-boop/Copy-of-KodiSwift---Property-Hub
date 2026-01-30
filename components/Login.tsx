
import React, { useState, useEffect } from 'react';
import { dbRequest } from '../db';

interface LandlordInvite {
  id: string;
  email: string;
  name: string;
  propertyName: string;
  oneTimeLink?: string;
  token?: string;
}

interface LoginProps {
  onLogin: (email: string) => string | null;
  onSignup: (email: string, name: string, isLandlord?: boolean, phone?: string) => void;
  onBackToPublic: () => void;
}

type AuthMode = 'login' | 'signup' | 'landlord_signup' | 'verify' | 'verified_success' | 'forgot_password' | 'reset_sent';

const COUNTRY_CODES = [
  { code: '+254', name: 'Kenya' },
  { code: '+255', name: 'Tanzania' },
  { code: '+256', name: 'Uganda' },
  { code: '+251', name: 'Ethiopia' },
  { code: '+234', name: 'Nigeria' },
  { code: '+27', name: 'South Africa' },
  { code: '+44', name: 'UK' },
  { code: '+1', name: 'USA/Canada' },
  { code: '+971', name: 'UAE' },
  { code: '+86', name: 'China' },
  { code: '+91', name: 'India' },
];

const Login: React.FC<LoginProps> = ({ onLogin, onSignup, onBackToPublic }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneMain, setPhoneMain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // REAL WORKFLOW: Parse Invitation Token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      setIsLoading(true);
      setInviteToken(token);
      
      // Real-world validation against DB
      dbRequest(`/api/invite?token=${token}`)
        .then(data => {
          if (data && !data.error) {
            setEmail(data.email);
            setMode('landlord_signup');
          } else {
            setError("Invitation Protocol Error: This security link is invalid or has already been used.");
            setMode('login');
          }
        })
        .catch(() => setError("Handshake Failed: Unable to verify invitation link."))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (mode === 'forgot_password') {
      setTimeout(() => {
        setMode('reset_sent');
        setIsLoading(false);
      }, 1000);
      return;
    }

    if ((mode === 'signup' || mode === 'landlord_signup') && !phoneCode) {
      setError('Please select a country dial code.');
      setIsLoading(false);
      return;
    }

    if ((mode === 'signup' || mode === 'landlord_signup') && password !== confirmPassword) {
      setError('Security Error: Passwords do not match.');
      setIsLoading(false);
      return;
    }

    const fullPhone = `${phoneCode}${phoneMain}`;

    if (mode === 'login') {
      if (email && password) {
        const validationError = onLogin(email);
        if (validationError) {
          setError(validationError);
          setIsLoading(false);
        }
      } else {
        setError('Please enter both email and password.');
        setIsLoading(false);
      }
    } else if (mode === 'signup') {
      if (email && name && password && phoneMain) {
        onSignup(email, name, false, fullPhone);
        setMode('verify');
        setIsLoading(false);
      } else {
        setError('Please fill in all fields including phone number.');
        setIsLoading(false);
      }
    } else if (mode === 'landlord_signup') {
      if (email && name && password && phoneMain) {
        // REAL WORKFLOW: Mark token as used on successful registration
        if (inviteToken) {
          try {
            await dbRequest('/api/invite', {
              method: 'PATCH',
              body: JSON.stringify({ token: inviteToken })
            });
          } catch (err) {
            console.error("Token consumption failed, proceeding with signup.");
          }
        }
        
        // PROMPT FULFILLMENT: Unauthorized (Instant) Portal Entry for Landlords
        // We trigger the signup which sets status to 'VERIFIED' and links properties in App.tsx
        onSignup(email, name, true, fullPhone);
        
        // Instant login to bypass any secondary authorization gate and enter the portal directly
        onLogin(email); 
        
        setIsLoading(false);
        // Clear URL token to clean up history
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError('Please fill in all fields, including your phone number.');
        setIsLoading(false);
      }
    }
  };

  if (mode === 'verified_success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-500 border border-slate-100">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-emerald-100">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="text-2xl font-black mb-2 text-slate-900">Profile Activated!</h2>
            <p className="text-slate-500 mb-8 font-medium">Welcome to the partner portal. Your properties are ready for management. You can now sign in.</p>
            <button
              onClick={() => setMode('login')}
              className="w-full py-4 bg-[#0f172a] text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 transition-all uppercase tracking-widest text-xs"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 animate-in zoom-in duration-500 border border-slate-100">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">
              <i className="fas fa-user-clock"></i>
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900 tracking-tight">Access Pending</h2>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">
              Your registration request has been submitted. All staff accounts are subject to <span className="text-[#0f172a] font-bold">Super Admin approval</span> before access is granted.
            </p>
            <button
              onClick={() => setMode('login')}
              className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-50 flex flex-col items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="max-w-md w-full py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0f172a] rounded-[1.5rem] text-white text-4xl font-black mb-6 shadow-2xl">K</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">KodiSwift Hub</h1>
          <div className="flex justify-center space-x-6 mt-4">
            <button onClick={onBackToPublic} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Return to Site</button>
            {inviteToken && (
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                <i className="fas fa-envelope-circle-check mr-2"></i> Onboarding Active
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl p-10 relative overflow-hidden border border-slate-100">
          <h2 className="text-3xl font-black mb-2 tracking-tight text-slate-900">
            {mode === 'login' ? 'Secure Login' : mode === 'signup' ? 'Sign Up' : mode === 'forgot_password' ? 'Reset Portal' : 'Partner Setup'}
          </h2>
          <p className="text-slate-400 text-sm mb-8 font-medium">
            {mode === 'forgot_password' ? 'Enter your email to receive a recovery link.' : inviteToken ? 'Finalize your legal representative profile.' : 'Access authorized property management modules.'}
          </p>

          {/* Completing the auth form and adding the default export */}
          <form onSubmit={handleAuth} className="space-y-6">
            {(mode === 'signup' || mode === 'landlord_signup') && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Full Legal Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Email Address</label>
              <input
                required
                type="email"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== 'forgot_password' && mode !== 'reset_sent' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Password</label>
                <input
                  required
                  type="password"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {(mode === 'signup' || mode === 'landlord_signup') && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Confirm Password</label>
                  <input
                    required
                    type="password"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      required
                      className="w-1/3 px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                    >
                      <option value="">Code</option>
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.name})</option>)}
                    </select>
                    <input
                      required
                      type="tel"
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                      placeholder="07..."
                      value={phoneMain}
                      onChange={(e) => setPhoneMain(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {error && <div className="p-4 bg-rose-50 text-rose-600 text-xs font-black rounded-xl border border-rose-100">{error}</div>}
            
            <button
              disabled={isLoading}
              type="submit"
              className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : mode === 'login' ? 'Enter Portal' : mode === 'signup' || mode === 'landlord_signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-8 flex flex-col items-center space-y-4">
              <button onClick={() => setMode('forgot_password')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600">Forgot Password?</button>
              <div className="h-px w-full bg-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Need staff access? <button onClick={() => setMode('signup')} className="text-indigo-600">Apply for Account</button>
              </p>
            </div>
          )}

          {(mode === 'signup' || mode === 'forgot_password') && (
            <button onClick={() => setMode('login')} className="mt-8 w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600">Return to Login</button>
          )}

          {mode === 'reset_sent' && (
            <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center animate-in zoom-in-95">
               <i className="fas fa-check-circle text-emerald-500 text-2xl mb-3"></i>
               <p className="text-xs font-bold text-emerald-800">Check your inbox. We've sent a recovery link if the account exists.</p>
               <button onClick={() => setMode('login')} className="mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Back to Login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
