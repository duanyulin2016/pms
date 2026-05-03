import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { parseChinesePassportMrzWithOcrFix } from './src/utils/mrzParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initial Database Structure
const initialState = {
  users: [
    {
      id: 'admin',
      username: 'admin',
      phone: '13800138000',
      email: 'admin@pms.com',
      password: 'admin',
      role: 'admin',
      status: 'approved'
    }
  ],
  records: [],
  logs: []
};

// Database Helper
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // --- API Routes ---

  // Users
  app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db.users);
  });

  app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find((u: any) => u.username === username);
    
    if (!user) return res.status(404).json({ message: '用户不存在' });
    if (user.password !== password) return res.status(401).json({ message: '密码错误' });
    if (user.status === 'pending') return res.status(403).json({ message: '账号正在等待审批' });
    
    res.json(user);
  });

  app.post('/api/users/register', (req, res) => {
    const newUser = req.body;
    const db = readDB();
    if (db.users.find((u: any) => u.username === newUser.username)) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    newUser.id = newUser.username;
    newUser.status = 'pending';
    db.users.push(newUser);
    writeDB(db);
    res.json(newUser);
  });

  app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const db = readDB();
    const index = db.users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...updates };
      writeDB(db);
      res.json(db.users[index]);
    } else {
      res.status(404).json({ message: '用户不存在' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.users = db.users.filter((u: any) => u.id !== id);
    writeDB(db);
    res.sendStatus(204);
  });

  // Records
  app.get('/api/records', (req, res) => {
    const db = readDB();
    res.json(db.records);
  });

  app.post('/api/records', (req, res) => {
    const newRecord = req.body;
    const db = readDB();
    db.records.unshift(newRecord);
    writeDB(db);
    res.status(201).json(newRecord);
  });

  app.patch('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const db = readDB();
    const index = db.records.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      db.records[index] = { ...db.records[index], ...updates };
      writeDB(db);
      res.json(db.records[index]);
    } else {
      res.status(404).json({ message: '记录不存在' });
    }
  });

  app.delete('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.records = db.records.filter((r: any) => r.id !== id);
    writeDB(db);
    res.sendStatus(204);
  });

  // Logs
  app.get('/api/logs', (req, res) => {
    const db = readDB();
    res.json(db.logs.slice(0, 100));
  });

  app.post('/api/logs', (req, res) => {
    const newLog = { ...req.body, id: Math.random().toString(36).substring(7), timestamp: new Date().toISOString() };
    const db = readDB();
    db.logs.unshift(newLog);
    writeDB(db);
    res.status(201).json(newLog);
  });

  // OCR Endpoint using DashScope Qwen VL Max (compatible API mode)
  app.post('/api/ocr', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ message: 'Image is required' });
      
      const apiKey = process.env.DASHSCOPE_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'DASHSCOPE_API_KEY environment variable is not set on the server.' });

      // Use the OpenAI-compatible completion endpoint for Qwen VL
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'system',
              content: `You are an expert OCR system. Extract the MRZ (Machine Readable Zone) from the passport image.
MRZ consists of exactly 2 lines at the bottom of the passport.
Output ONLY a JSON object containing the raw MRZ text in a 'mrz' key. 

OUTPUT FORMAT:
{
  "mrz": "line1\\nline2"
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: image
                  }
                },
                {
                  type: 'text',
                  text: 'Please scan the passport MRZ from this image and return the parsed JSON.'
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API Error:', errorText);
        return res.status(response.status).json({ message: 'OCR server failed to process the image.' });
      }

      const data = await response.json();
      try {
        let resultText = data.choices[0].message.content;
        
        // Try to extract from markdown code blocks first
        const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          resultText = jsonMatch[1];
        } else {
          // Fallback: try to find the outermost {}
          const firstBrace = resultText.indexOf('{');
          const lastBrace = resultText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            resultText = resultText.substring(firstBrace, lastBrace + 1);
          }
        }
        
        const parsed = JSON.parse(resultText);
        let rawMrz = parsed.mrz || '';
        
        // Use our robust offline parser with OCR heuristic fixes
        const parsedMrz = parseChinesePassportMrzWithOcrFix(rawMrz);
        if ('error' in parsedMrz) {
          return res.status(400).json({ message: parsedMrz.error, raw: rawMrz });
        }
        
        // Map to frontend expected format
        const mappedResult = {
          passportId: parsedMrz.documentNumber || '',
          name: ((parsedMrz.surname || '') + ' ' + (parsedMrz.givenNames || '')).trim(),
          dob: parsedMrz.birthDate || '',
          expiryDate: parsedMrz.expiryDate || '',
          country: parsedMrz.issuingCountry || '',
          nationality: parsedMrz.nationality || '',
          sex: parsedMrz.sex || '',
          checksumValid: parsedMrz.checks?.overallValid ?? true,
          rawMrz: parsedMrz.correctedMrz || rawMrz,
          notes: parsedMrz.ocrCorrections && parsedMrz.ocrCorrections.length > 0 
            ? `OCR Corrections: ${parsedMrz.ocrCorrections.join(', ')}` 
            : ''
        };
        
        res.json(mappedResult);
      } catch (parseError) {
        console.error('Failed to parse OCR response as JSON:', data.choices[0].message.content);
        res.status(500).json({ message: 'Failed to parse AI response.', raw: data.choices[0].message.content });
      }
    } catch (e: any) {
      console.error('OCR API Exception:', e);
      res.status(500).json({ message: e.message || 'Unknown error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Passport Management System (LOCAL) running on http://localhost:${PORT}`);
  });
}

startServer();
