import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Sparkles, LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function LoginPage() {
  const { login, loginWithEmail, register, resetPassword } = useAuth();
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isTroubleOpen, setIsTroubleOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Connection shim for perfection
  React.useEffect(() => {
    const timer = setTimeout(() => setIsAuthReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleResetPassword = async () => {
    if (!email.trim() || !validateEmail(email.trim())) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      toast.success("Password reset email sent! Check your inbox.");
      setIsResettingPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!validateEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error("Please enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        
        await register(trimmedEmail, trimmedPassword, name.trim());
        setSuccess(true);
        toast.success(`Welcome to VoxForge, ${name.trim()}!`);
      } else {
        await loginWithEmail(trimmedEmail, trimmedPassword);
        setSuccess(true);
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      console.error("Auth error:", error.code, error.message);
      
      let message = "Authentication failed. Please try again.";
      let description = "";
      
      if (error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
        description = "Check your password or register if you haven't yet. If you used Google before, link your account manually or just use the Google button.";
      } else if (error.code === 'auth/user-not-found') {
        message = "Account not found.";
        description = "We couldn't find an account with this email. Switch to the 'Register' tab to create one.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Incorrect password.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Configuration Issue.";
        description = "Email/Password sign-ins are currently restricted in the console. Please verify your Firebase project settings.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Email already registered.";
        description = "This account already exists. Please switch to the 'Sign In' tab to log in, or use 'Forgot Password'.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many attempts.";
        description = "This account has been temporarily disabled due to many failed login attempts. Reset your password or try again later.";
      }
      
      toast(message, {
        description: description,
        duration: 8000,
        action: error.code === 'auth/invalid-credential' ? {
          label: "Register Now",
          onClick: () => setIsRegistering(true)
        } : error.code === 'auth/email-already-in-use' ? {
          label: "Sign In Instead",
          onClick: () => setIsRegistering(false)
        } : undefined
      });
    } finally {
      if (!success) setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await login();
      toast.success("Logged in with Google!");
    } catch (error: any) {
      toast.error("Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcff] p-4 font-sans overflow-hidden">
      {!isAuthReady && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Securing Connection...</p>
        </motion.div>
      )}

      {success && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-green-200"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Success!</h2>
          <p className="text-zinc-500 mt-2">Redirecting you to the dashboard...</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        <Card className="glass-card overflow-hidden border-none shadow-2xl relative z-10">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles className="w-48 h-48" />
          </div>
          
          <CardHeader className="text-center pt-10 pb-6 relative z-10">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 3, scale: 1 }}
              className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20"
            >
              <Phone className="w-8 h-8 text-white -rotate-12" />
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight">VoxForge AI</CardTitle>
            <CardDescription className="text-zinc-500 mt-2">
              Automated Voice Announcements for Everyone
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-10 relative z-10">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-6">
              <p className="text-[11px] text-blue-700 leading-relaxed italic">
                {isRegistering 
                  ? "Note: Creating an account will automatically sign you in. You won't need to sign in again after registering." 
                  : "Welcome back! If you don't have an account yet, use the Register tab to create one."}
              </p>
            </div>

            <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${!isRegistering ? 'bg-white shadow-sm text-primary' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${isRegistering ? 'bg-white shadow-sm text-primary' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isRegistering ? 'register' : 'login'}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {isRegistering && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input 
                          id="name"
                          placeholder="Girish G"
                          className="pl-10 h-11"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="email"
                        type="email"
                        placeholder="founder@blueforge.com"
                        className="pl-10 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {isRegistering && password.length > 0 && (
                      <div className="flex gap-1 items-center mt-2">
                        <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-green-500' : 'bg-red-400'}`} />
                        <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-500' : 'bg-zinc-200'}`} />
                        <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 12 ? 'bg-green-500' : 'bg-zinc-200'}`} />
                        <span className="text-[10px] font-bold text-zinc-400 ml-2 uppercase">
                          {password.length < 6 ? 'Too Short' : password.length < 10 ? 'Fair' : 'Strong'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsResettingPassword(true)}
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {!isRegistering && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-tight">
                    <strong>New here?</strong> You must register before signing in with an email and password.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full h-12 font-bold mt-2" disabled={loading}>
                {loading ? (
                  <Sparkles className="w-5 h-5 animate-spin mr-2" />
                ) : isRegistering ? (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#fdfcff] px-2 text-zinc-400 font-bold">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-12 font-bold border-zinc-200 hover:bg-zinc-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            
            <div className="mt-8 pt-6 border-t border-zinc-100">
              <p className="text-[10px] text-center text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Founded by Girish G
              </p>
              <p className="text-[9px] text-center text-zinc-300 mt-1">
                Universal Accessibility • Powered by AI
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xs">
        <button 
          onClick={() => setIsTroubleOpen(!isTroubleOpen)}
          className="w-full text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-3 h-3" />
          Login Issues? Click for Help
        </button>
        
        <AnimatePresence>
          {isTroubleOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-2 bg-white border border-zinc-200 p-4 rounded-xl shadow-xl text-[11px] text-zinc-600 space-y-3"
            >
              <div className="space-y-1">
                <p className="font-bold text-zinc-900 border-b border-zinc-100 pb-1 mb-2">Troubleshooting Guide</p>
                <div className="flex gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <p><strong>Register First:</strong> You cannot "Sign In" until you have created an account on the "Register" tab.</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <p><strong>Check Firebase:</strong> Ensure "Email/Password" is <strong>Enabled</strong> in your Firebase Console under Authentication.</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <p><strong>Google Login:</strong> If you use Google, you don't have a password. Use the Google button instead.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isResettingPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Reset Password</h3>
                <p className="text-sm text-zinc-500">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleResetPassword} disabled={loading} className="font-bold h-11">
                  {loading ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : "Send Reset Link"}
                </Button>
                <Button variant="ghost" onClick={() => setIsResettingPassword(false)} className="font-bold underline text-xs">
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
