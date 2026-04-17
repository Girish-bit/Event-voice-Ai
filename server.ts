import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Global state to store the latest event details for inbound calls
// In a real app, this would be in a database
let latestEventScript = "Hello! Thank you for calling. Please stay tuned for our upcoming college fest announcements. Have a great day!";
let latestLanguage = 'English';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Inbound Call Route
  app.post("/api/inbound-call", (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    const voiceConfig = latestLanguage === 'Kannada' 
      ? { language: 'kn-IN', voice: 'Polly.Aditi' } 
      : { language: 'en-IN', voice: 'Polly.Raveena' };

    twiml.say({ 
      voice: voiceConfig.voice as any,
      language: voiceConfig.language as any
    }, latestEventScript);
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  app.post("/api/set-script", (req, res) => {
    const { script, language } = req.body;
    latestEventScript = script;
    latestLanguage = language;
    res.json({ success: true });
  });

  // API Routes
  app.post("/api/make-call", async (req, res) => {
    const { phone, script, language = 'English' } = req.body;
    
    // Update global state for inbound calls
    latestEventScript = script;
    latestLanguage = language;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    let fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ 
        error: "Twilio credentials missing. Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in your secrets." 
      });
    }

    // Clean the fromNumber: remove spaces, dashes, dots, etc.
    // Keep only + and digits
    fromNumber = fromNumber.replace(/[^\d+]/g, '');

    // If it's a Messaging Service SID (starts with MG), don't prepend +
    // Otherwise, ensure it's E.164
    if (!fromNumber.startsWith('MG') && !fromNumber.startsWith('+')) {
      fromNumber = '+' + fromNumber;
    }

    // Ensure target phone is in E.164 format
    let targetPhone = phone.replace(/[^\d+]/g, '');
    if (!targetPhone.startsWith('+')) {
      targetPhone = '+' + targetPhone;
    }

    // Basic length validation for E.164 (usually 7-15 digits)
    const digitCount = targetPhone.replace(/\D/g, '').length;
    if (digitCount < 7) {
      return res.status(400).json({ 
        error: `The phone number ${targetPhone} is too short to be a valid international number.`,
        code: 21219
      });
    }

    console.log(`Attempting ${language} call from ${fromNumber} to ${targetPhone}`);

    const client = twilio(accountSid, authToken);

    try {
      const voiceConfig = language === 'Kannada' 
        ? { language: 'kn-IN', voice: 'Polly.Aditi' } // Aditi is high quality for Kannada
        : { language: 'en-IN', voice: 'Polly.Raveena' }; // Raveena sounds more mature and professional for Indian English

      const call = await client.calls.create({
        twiml: `<Response><Say ${voiceConfig.language ? `language="${voiceConfig.language}"` : ''} voice="${voiceConfig.voice}">${script}</Say></Response>`,
        to: targetPhone,
        from: fromNumber,
      });

      console.log(`Call successfully queued. SID: ${call.sid}`);
      res.json({ success: true, callSid: call.sid });
    } catch (error: any) {
      console.error("Twilio Error Details:", {
        code: error.code,
        message: error.message,
        moreInfo: error.moreInfo,
        status: error.status,
        to: targetPhone,
        from: fromNumber
      });

      let userMessage = error.message;
      
      // Map common Twilio error codes to helpful user messages
      switch (error.code) {
        case 21212:
          userMessage = `The 'From' number (${fromNumber}) is not a valid Twilio number for your account. Please check your Twilio Console -> Phone Numbers -> Active Numbers. You must use a number you own.`;
          break;
        case 21219:
          userMessage = `The 'To' number (${targetPhone}) is invalid. Ensure it includes the country code (e.g., +91 for India) and has no extra digits.`;
          break;
        case 21608:
          userMessage = `Trial Account Limit: The number ${targetPhone} is not verified. On a Twilio Trial account, you can only call numbers you have verified in your Twilio Console.`;
          break;
        case 21408:
          userMessage = `Geo-Permission Error: Calling to ${targetPhone} is disabled for your account. Go to Twilio Console -> Voice -> Settings -> Geo-Permissions and enable the destination country.`;
          break;
        case 20003:
          userMessage = "Invalid Twilio Credentials: Your Account SID or Auth Token is incorrect. Please check your Secrets settings.";
          break;
        default:
          userMessage = `Twilio Error (${error.code}): ${error.message}. Check the 'More Info' link in the console for details.`;
      }

      res.status(error.status || 500).json({ 
        error: userMessage,
        code: error.code,
        moreInfo: error.moreInfo
      });
    }
  });

  // Diagnostic endpoint to check credentials
  app.get("/api/check-twilio", async (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.json({ 
        configured: false, 
        missing: [
          !accountSid && "TWILIO_ACCOUNT_SID",
          !authToken && "TWILIO_AUTH_TOKEN",
          !fromNumber && "TWILIO_PHONE_NUMBER"
        ].filter(Boolean)
      });
    }

    try {
      const client = twilio(accountSid, authToken);
      const account = await client.api.v2010.accounts(accountSid).fetch();
      
      // Check if the from number is actually in the account
      const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
      const cleanFrom = fromNumber.replace(/[^\d+]/g, '');
      const hasNumber = incomingNumbers.some(n => n.phoneNumber.includes(cleanFrom) || cleanFrom.includes(n.phoneNumber.replace(/[^\d+]/g, '')));

      res.json({ 
        configured: true, 
        status: account.status,
        type: account.type,
        hasFromNumber: hasNumber,
        fromNumberUsed: cleanFrom,
        availableNumbers: incomingNumbers.map(n => n.phoneNumber)
      });
    } catch (error: any) {
      res.json({ 
        configured: true, 
        error: error.message, 
        code: error.code 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
