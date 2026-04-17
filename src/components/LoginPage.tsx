import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Sparkles, LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function LoginPage() {
  const { login, loginWithEmail, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password; // Passwords shouldn't be trimmed usually, but often people accidentally add space at end of email

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error("Please enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        
        await register(trimmedEmail, trimmedPassword, name.trim());
        toast.success("Account created successfully!");
      } else {
        await loginWithEmail(trimmedEmail, trimmedPassword);
        toast.success("Logged in successfully!");
      }
    } catch (error: any) {
      console.error("Auth error:", error.code, error.message);
      
      let message = "Authentication failed. Please try again.";
      
      if (error.code === 'auth/invalid-credential') {
        message = "Incorrect email or password. If you haven't registered yet, please use the Register tab.";
      } else if (error.code === 'auth/user-not-found') {
        message = "No account found with this email. Please register first.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please sign in instead.";
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
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
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcff] p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card overflow-hidden border-none shadow-2xl relative">
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
            <CardTitle className="text-3xl font-bold tracking-tight">Student Voice Pro</CardTitle>
            <CardDescription className="text-zinc-500 mt-2">
              Automated Voice Announcements for College Fests
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
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

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
            
            <p className="text-[10px] text-center text-zinc-400 mt-4 uppercase tracking-widest font-bold">
              Secure Coordinator Portal
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
