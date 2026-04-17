/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Info, 
  Phone, 
  Sparkles, 
  Play, 
  History,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { generateCallScript } from './lib/gemini';
import { EventDetails, CallScript, Contact } from './types';
import { CallSimulation } from './components/CallSimulation';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { LogOut, User as UserIcon } from 'lucide-react';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [details, setDetails] = useState<EventDetails>({
    eventName: '',
    date: '',
    time: '',
    location: '',
    extraInfo: ''
  });

  const [script, setScript] = useState<CallScript | null>(null);
  const [language, setLanguage] = useState<'English' | 'Kannada'>('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [history, setHistory] = useState<(EventDetails & { script: string, id: string })[]>([]);
  
  const [contactDump, setContactDump] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [defaultCountryCode, setDefaultCountryCode] = useState('+91');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateDump = (text: string) => {
    if (!text.trim()) {
      setValidationError(null);
      return;
    }
    const lines = text.split('\n').filter(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      if (parts.length > 2) {
        setValidationError(`Line ${i + 1} has too many commas. Use "Name, Phone" format.`);
        return;
      }
      const phonePart = parts[1] || parts[0];
      const digits = phonePart.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 7) {
        setValidationError(`Line ${i + 1}: Phone number seems too short.`);
        return;
      }
    }
    setValidationError(null);
  };

  const handleDumpChange = (val: string) => {
    setContactDump(val);
    validateDump(val);
  };
  const [twilioStatus, setTwilioStatus] = useState<{
    configured: boolean;
    error?: string;
    hasFromNumber?: boolean;
    availableNumbers?: string[];
    missing?: string[];
  } | null>(null);
  const [isCheckingTwilio, setIsCheckingTwilio] = useState(false);
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const saveToHistory = (eventDetails: EventDetails, scriptText: string) => {
    const newEntry = {
      ...eventDetails,
      script: scriptText,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const loadFromHistory = (entry: any) => {
    setDetails({
      eventName: entry.eventName,
      date: entry.date,
      time: entry.time,
      location: entry.location,
      extraInfo: entry.extraInfo || ''
    });
    setScript({
      text: entry.script,
      wordCount: entry.script.split(/\s+/).length
    });
    setIsHistoryOpen(false);
    toast.success("Past event loaded!");
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    toast.success("History item deleted");
  };

  const checkTwilio = async () => {
    setIsCheckingTwilio(true);
    try {
      const response = await fetch('/api/check-twilio');
      const data = await response.json();
      setTwilioStatus(data);
      if (data.configured && !data.error) {
        toast.success("Twilio credentials are valid!");
      } else if (data.error) {
        toast.error(`Twilio Error: ${data.error}`);
      } else if (!data.configured) {
        toast.error(`Missing secrets: ${data.missing.join(', ')}`);
      }
    } catch (error) {
      toast.error("Failed to check Twilio status");
    } finally {
      setIsCheckingTwilio(false);
    }
  };
  const handleGenerate = async () => {
    if (!details.eventName || !details.date || !details.time || !details.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateCallScript(details, language);
      setScript(generated);
      saveToHistory(details, generated.text);
      
      // Sync with server for inbound calls
      await fetch('/api/set-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: generated.text, language })
      });

      toast.success(`Script generated in ${language} and synced!`);
    } catch (error) {
      toast.error("Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseContacts = () => {
    const lines = contactDump.split('\n').filter(line => line.trim());
    const newContacts: Contact[] = lines.map((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      const name = parts[0] || `Student ${index + 1}`;
      let rawPhone = parts[1] || parts[0] || 'Unknown';
      let phone = rawPhone;
      
      // Clean phone number: keep only digits and +
      if (phone !== 'Unknown') {
        // Remove all non-digits except +
        phone = phone.replace(/[^\d+]/g, '');
        
        // Handle leading zeros (common in local formats)
        while (phone.startsWith('0')) {
          phone = phone.substring(1);
        }

        // If it doesn't start with +, prepend the default country code
        if (!phone.startsWith('+')) {
          const cleanCode = defaultCountryCode.replace(/[^\d]/g, '');
          // If it already starts with the country code digits (e.g. 91), just prepend +
          if (cleanCode && phone.startsWith(cleanCode)) {
            phone = '+' + phone;
          } else {
            const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : '+' + defaultCountryCode;
            phone = prefix + phone;
          }
        }
      }

      // Final validation: must be at least 10 digits total (including country code)
      const digitCount = phone.replace(/\D/g, '').length;
      const isInvalid = phone === 'Unknown' || digitCount < 10;

      return {
        id: Math.random().toString(36).substr(2, 9),
        name,
        phone,
        status: isInvalid ? 'invalid' : 'pending'
      };
    });
    setContacts(newContacts);
    if (newContacts.length > 0) {
      const invalidCount = newContacts.filter(c => c.status === 'invalid').length;
      if (invalidCount > 0) {
        toast.error(`Parsed ${newContacts.length} contacts, but ${invalidCount} have invalid numbers.`);
      } else {
        toast.success(`Parsed ${newContacts.length} contacts. All numbers look valid!`);
      }
    }
  };

  const handleStartCall = async () => {
    if (!script) {
      toast.error("Please generate a script first");
      return;
    }
    if (contacts.length === 0) {
      toast.error("Please add at least one contact");
      return;
    }

    // Check if Twilio is configured (optional front-end check, backend will also check)
    setIsCallOpen(true);
    
    // Add to history
    const newEntry = {
      ...details,
      script: script.text,
      id: Math.random().toString(36).substr(2, 9)
    };
    setHistory([newEntry, ...history]);
  };

  const makeRealCall = async (contact: Contact) => {
    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contact.phone,
          script: script?.text,
          language: language
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Call initiated to ${contact.name}`);
        handleContactComplete(contact.id);
      } else {
        // Show the detailed error from the backend
        toast.error(`Call Error: ${data.error}`, {
          duration: 15000,
          description: data.code === 21219 || data.code === 21408 ? "Click 'Troubleshoot' in the header for help." : undefined
        });
        console.error("Call failed:", data);
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'failed' } : c));
      }
    } catch (error) {
      toast.error(`Network error calling ${contact.name}`);
    }
  };

  const handleContactComplete = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'completed' } : c));
  };

  const resetForm = () => {
    setDetails({
      eventName: '',
      date: '',
      time: '',
      location: '',
      extraInfo: ''
    });
    setScript(null);
    setContacts([]);
    setContactDump('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-bottom border-zinc-200 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">EventVoice AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
              onClick={() => setIsTroubleshootOpen(true)}
            >
              <Info className="w-4 h-4" />
              Troubleshoot
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-2 ${twilioStatus?.configured && !twilioStatus.error ? 'border-green-200 bg-green-50 text-green-700' : ''}`}
              onClick={checkTwilio}
              disabled={isCheckingTwilio}
            >
              <Settings className={`w-4 h-4 ${isCheckingTwilio ? 'animate-spin' : ''}`} />
              {twilioStatus?.configured && !twilioStatus.error ? 'Twilio Connected' : 'Check Twilio'}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)}>
              <History className="w-5 h-5" />
            </Button>
            <div className="h-8 w-px bg-zinc-200 mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-zinc-900 leading-tight">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-zinc-500 leading-tight uppercase font-bold">Admin</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout} 
                className="flex items-center gap-2 text-zinc-500 hover:text-red-600 transition-colors px-3 py-1.5 h-auto rounded-lg hover:bg-red-50"
              >
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Sign Out</span>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Contacts */}
        <div className="lg:col-span-7 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">1. Event Details</h2>
              <Button variant="outline" size="sm" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" /> New Session
              </Button>
            </div>

            {twilioStatus && (twilioStatus.error || !twilioStatus.configured || !twilioStatus.hasFromNumber) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Twilio Configuration Issue
                </div>
                <p className="text-xs text-red-600">
                  {twilioStatus.error || (twilioStatus.configured && !twilioStatus.hasFromNumber && `The number you entered (${twilioStatus.fromNumberUsed}) is not found in your Twilio account. Available numbers: ${twilioStatus.availableNumbers?.join(', ') || 'None'}`)}
                  {!twilioStatus.configured && `Missing Secrets: ${twilioStatus.missing?.join(', ')}`}
                </p>
                <p className="text-[10px] text-red-500 italic">
                  Go to Settings &rarr; Secrets to fix these values.
                </p>
              </div>
            )}
            
            <Card className="glass-card">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input 
                    id="eventName" 
                    placeholder="e.g. CSA Branch Fest 2024" 
                    value={details.eventName}
                    onChange={(e) => setDetails({ ...details, eventName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="date" 
                        placeholder="Oct 24, 2024" 
                        className="pl-10"
                        value={details.date}
                        onChange={(e) => setDetails({ ...details, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="time" 
                        placeholder="10:00 AM" 
                        className="pl-10"
                        value={details.time}
                        onChange={(e) => setDetails({ ...details, time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    <Input 
                      id="location" 
                      placeholder="Main Auditorium, CSA Block" 
                      className="pl-10"
                      value={details.location}
                      onChange={(e) => setDetails({ ...details, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extraInfo">Extra Information (Optional)</Label>
                  <Textarea 
                    id="extraInfo" 
                    placeholder="e.g. Bring your ID cards, Free entry for CSA students" 
                    className="min-h-[80px]"
                    value={details.extraInfo}
                    onChange={(e) => setDetails({ ...details, extraInfo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Call Language</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={language === 'English' ? 'default' : 'outline'} 
                      className="flex-1 h-9 text-xs"
                      onClick={() => setLanguage('English')}
                    >
                      English
                    </Button>
                    <Button 
                      variant={language === 'Kannada' ? 'default' : 'outline'} 
                      className="flex-1 h-9 text-xs"
                      onClick={() => setLanguage('Kannada')}
                    >
                      ಕನ್ನಡ (Kannada)
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-lg font-medium" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                      Generating Script...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate AI Script
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">2. Contact Dump (CSA Branch)</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-100 rounded-md px-2 py-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Prefix:</span>
                  <input 
                    type="text" 
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    className="w-10 bg-transparent text-xs font-bold border-none focus:ring-0 p-0"
                  />
                </div>
                <Badge variant="outline" className="text-zinc-500">
                  {contacts.length} Contacts Loaded
                </Badge>
              </div>
            </div>
            
            <Card className="glass-card">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contactDump">Paste Contacts (Format: Name, Phone per line)</Label>
                    {validationError ? (
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {validationError}
                      </span>
                    ) : contactDump.trim() ? (
                      <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Format looks good
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">Example: Rahul Sharma, 9876543210</p>
                  <Textarea 
                    id="contactDump" 
                    placeholder="Rahul Sharma, 9876543210&#10;Priya Singh, 8765432109" 
                    className={`min-h-[150px] font-mono text-sm transition-colors ${validationError ? 'border-red-300 bg-red-50/30' : contactDump.trim() ? 'border-green-200 bg-green-50/10' : ''}`}
                    value={contactDump}
                    onChange={(e) => handleDumpChange(e.target.value)}
                  />
                </div>
                <Button 
                  variant={validationError ? "destructive" : "secondary"} 
                  className="w-full" 
                  onClick={parseContacts}
                  disabled={!!validationError && contacts.length === 0}
                >
                  {validationError ? 'Fix Errors to Parse' : 'Parse & Load Contacts'}
                </Button>

                {contacts.length > 0 && (
                  <div className="mt-4 max-h-[300px] overflow-y-auto border rounded-lg divide-y bg-zinc-50/50">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="p-3 flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{contact.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500">{contact.phone}</span>
                            {contact.status === 'completed' && (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => makeRealCall(contact)}
                            disabled={!script || contact.status === 'invalid'}
                          >
                            <Phone className={`w-4 h-4 ${contact.status === 'invalid' ? 'text-zinc-300' : 'text-primary'}`} />
                          </Button>
                          <Badge 
                            variant={contact.status === 'completed' ? 'default' : contact.status === 'invalid' ? 'destructive' : 'outline'}
                            className={contact.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 'text-[10px]'}
                          >
                            {contact.status === 'completed' ? 'Called' : contact.status === 'invalid' ? 'Invalid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column: Preview & Action */}
        <div className="lg:col-span-5 space-y-6">
          <section className="sticky top-24">
            <h2 className="text-2xl font-bold tracking-tight mb-4">3. Final Review</h2>
            
            <Card className="glass-card overflow-hidden">
              <div className="bg-primary p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Play className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Voice Preview</span>
                </div>
                {script && (
                  <Badge variant="secondary" className="bg-white/10 text-white border-none">
                    {script.wordCount} Words
                  </Badge>
                )}
              </div>
              <CardContent className="p-6 min-h-[350px] flex flex-col justify-between">
                {script ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-lg leading-relaxed font-medium italic text-zinc-700">
                        "{script.text}"
                      </p>
                      <div className="flex flex-wrap gap-2 pt-4">
                        <Badge variant="outline" className="bg-zinc-50">Friendly Tone</Badge>
                        <Badge variant="outline" className="bg-zinc-50">{language} Language</Badge>
                        <Badge variant="outline" className="bg-zinc-50">Fest Notification</Badge>
                      </div>
                    </motion.div>
                    
                    <div className="pt-8 space-y-3">
                      <Button 
                        className="w-full h-16 text-xl bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
                        onClick={handleStartCall}
                        disabled={contacts.length === 0}
                      >
                        <Phone className="w-6 h-6 mr-2" /> 
                        {contacts.length > 1 ? `Call All ${contacts.length} Students` : 'Start Voice Call'}
                      </Button>
                      <p className="text-[10px] text-center text-zinc-400 uppercase tracking-widest font-bold">
                        Automated sequence will call each student in the list
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-zinc-400">No Script Generated</h3>
                      <p className="text-sm text-zinc-400 max-w-[200px]">
                        Fill in the event details and click generate to see your AI voice script.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-orange-900">Bulk Calling Mode</h4>
                <p className="text-xs text-orange-700 leading-relaxed">
                  You have loaded {contacts.length} contacts. The system will iterate through each one, simulating a real call experience with the AI script.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-8 border-t bg-white/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-zinc-500 font-medium">
            Developed by <span className="text-zinc-900 font-bold">Girish G</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">
            Founder of Blueforge Digital
          </p>
        </div>
      </footer>

      <CallSimulation 
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        script={script?.text || ""}
        contacts={contacts.length > 0 ? contacts : [{ id: '1', name: 'Guest', phone: 'Unknown', status: 'pending' }]}
        language={language}
        onComplete={handleContactComplete}
        onMakeRealCall={makeRealCall}
      />
      
      <Toaster position="top-center" />

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold">Event History</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)}>
                <Plus className="w-5 h-5 rotate-45" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No history yet. Generate a script to see it here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-zinc-100 hover:border-blue-200 transition-colors group">
                    <CardContent className="p-0">
                      <div className="p-4 bg-zinc-50/50 flex items-start justify-between border-b">
                        <div>
                          <h4 className="font-bold text-zinc-900">{item.eventName}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.time}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1"
                            onClick={() => loadFromHistory(item)}
                          >
                            <Play className="w-3 h-3" /> Load
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-500"
                            onClick={() => deleteHistoryItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-zinc-600 line-clamp-2 italic">"{item.script}"</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="p-6 border-t bg-zinc-50 flex justify-end">
              <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Troubleshooting Modal */}
      {isTroubleshootOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold">Call Troubleshooting Guide</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsTroubleshootOpen(false)}>
                <Plus className="w-5 h-5 rotate-45" />
              </Button>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h4 className="font-bold text-orange-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center text-xs">1</span>
                  Error 21219: Invalid Phone Number
                </h4>
                <div className="pl-8 space-y-2 text-sm text-zinc-600">
                  <p>This means Twilio doesn't recognize the student's number. Check these:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Country Code:</strong> Does the number start with <code className="bg-zinc-100 px-1 rounded">+91</code> (India) or your country code?</li>
                    <li><strong>Length:</strong> Is the number too short or too long? (Standard India numbers are 10 digits + 91).</li>
                    <li><strong>Prefix Box:</strong> Check the "Prefix" box in Step 2. If it's wrong, all your parsed numbers will be wrong.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-orange-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center text-xs">2</span>
                  "Call Initiated" but no phone rings?
                </h4>
                <div className="pl-8 space-y-2 text-sm text-zinc-600">
                  <p>This is usually a <strong>Geo-Permission</strong> issue in your Twilio account:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Go to your <strong>Twilio Console</strong>.</li>
                    <li>Navigate to <strong>Voice &rarr; Settings &rarr; Geo-Permissions</strong>.</li>
                    <li>Find <strong>India</strong> (or your country) and make sure the checkbox is <strong>Checked</strong>.</li>
                    <li>Click <strong>Save</strong> at the bottom of the Twilio page.</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-orange-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center text-xs">3</span>
                  Twilio Trial Account Limits
                </h4>
                <div className="pl-8 space-y-2 text-sm text-zinc-600">
                  <p>If you are on a free trial, you can <strong>ONLY</strong> call numbers that you have manually verified in your Twilio Console.</p>
                  <p className="italic">To call any student, you must upgrade your Twilio account to a paid plan.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-zinc-50 flex justify-end">
              <Button onClick={() => setIsTroubleshootOpen(false)}>Got it, I'll check</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
