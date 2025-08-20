require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const { pathToRegexp } = require('path-to-regexp');


const app = express();

// Ping route - keep server awake
app.get("/api/ping", (req, res) => {
  res.send("Backend is awake!");
});


// 🔥 Global error event logs
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug request body/file
app.use((req, res, next) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILE:", req.file || "No file uploaded");
  next();
});

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// -------------------
// 🚨 ROUTE SCANNER
// -------------------
function scanRoutes(dir) {
  const errors = [];

  function checkFile(filePath) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    lines.forEach((line, idx) => {
      const match = line.match(/\brouter\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]*)['"`]/);
      if (match) {
        const routePath = match[2];

        // empty param check
        if (/\/:(?=\/|$|\?)/.test(routePath)) {
          errors.push({
            file: filePath,
            line: idx + 1,
            pattern: routePath,
            type: 'Empty param',
            suggestion: 'Replace empty param with a valid name, e.g., /:id'
          });
        }

        // path-to-regexp validation
        try {
          pathToRegexp(routePath);
        } catch (err) {
          errors.push({
            file: filePath,
            line: idx + 1,
            pattern: routePath,
            type: 'Invalid pattern',
            message: err.message,
            suggestion: 'Check route syntax'
          });
        }
      }
    });
  }

  function walk(dirPath) {
    fs.readdirSync(dirPath).forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
      else if (file.endsWith('.js')) checkFile(fullPath);
    });
  }

  walk(dir);

  if (errors.length) {
    console.error('\n❌ Found invalid routes:');
    errors.forEach(e => {
      console.error(`\nFile: ${e.file}`);
      console.error(`Line: ${e.line}`);
      console.error(`Pattern: "${e.pattern}"`);
      console.error(`Type: ${e.type}`);
      if (e.message) console.error(`Error: ${e.message}`);
      console.error(`Suggestion: ${e.suggestion}`);
    });
    console.error('\n❌ Fix all route errors before starting the server.');
    process.exit(1);
  } else {
    console.log('✅ All route patterns are valid.');
  }
}

// -------------------
// Run scanner BEFORE mounting routes
// -------------------
scanRoutes(path.join(__dirname, 'routes'));

// -------------------
// Mount routes AFTER scan passes
// -------------------
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  const filePath = path.join(routesPath, file);
  const router = require(filePath);
  const mountPath = `/api/${path.basename(file, '.js')}`;
  app.use(mountPath, router);
  console.log(`✅ Mounted ${mountPath}`);
});

// -------------------
// Multer + Result Upload endpoint
// -------------------
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const valid = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    cb(valid ? null : new Error('Only images allowed'), valid);
  }
});

const Result = require('./models/result');
app.post('/api/results/upload', upload.single('screenshot'), async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, prize } = req.body;
    if (!userId || !tournamentId || kills === undefined || rank === undefined || prize === undefined) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    const exists = await Result.findOne({ userId, tournamentId });
    if (exists) return res.status(409).json({ success: false, message: 'Already submitted' });

    const result = new Result({
      userId, tournamentId, kills, rank, prize,
      screenshotUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await result.save();
    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error('❌ Result upload error:', err.message);
    res.status(500).json({ success: false, message: 'Upload error' });
  }
});

// -------------------
// Global error handler
// -------------------
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ready: http://localhost:${PORT}`));
