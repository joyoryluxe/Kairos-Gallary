require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const clientRoutes = require('./src/routes/client');

const app = express();

// Connect to MongoDB
connectDB();

// ─── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://crm.kairosstudio.in',
  'https://crm.kairos.com',
];

// Helper to check if an origin is allowed (strips trailing slashes for comparison)
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin (mobile apps, curl, etc.)
  const cleanOrigin = origin.replace(/\/+$/, ''); // strip trailing slashes
  return allowedOrigins.some((o) => o.replace(/\/+$/, '') === cleanOrigin);
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle ALL preflight OPTIONS requests — this ensures the browser
// always gets proper CORS headers back, even before auth/multer middleware runs.
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Health check & Status ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '📸 Kairos Photography Gallery API is running.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);

  // Ensure CORS headers are present even on error responses.
  // Without this, if multer/auth throws, the browser sees no CORS headers
  // and reports a misleading "blocked by CORS policy" error.
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Kairos API running on http://localhost:${PORT}`);
});
