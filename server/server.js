require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Redis: UpstashRedis } = require('@upstash/redis');
const IoRedis = require('ioredis');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto'); // Built-in cryptography module

const app = express();
const server = http.createServer(app);

// Use CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Socket.io
const io = new Server(server, {
  maxHttpBufferSize: 5e7, // 50MB limit max payload size
  cors: {
  origin: [
    "https://secureprintout.in", 
    "https://shop.secureprintout.in",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST"]
}
});

// Initialize Redis Client securely
let redis;
let isUpstash = false;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = UpstashRedis.fromEnv();
  isUpstash = true;
  console.log('=> Connected to Upstash Redis (REST) successfully');
  // Mock event emitters so ioredis-specific app events don't crash
  redis.on = () => {};
} else {
  redis = new IoRedis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('connect', () => {
    console.log('=> Connected to TCP Redis Instance');
  });
  redis.on('error', (err) => {
    console.error('=> Redis connection error:', err);
  });
}

// Setup Multer exclusively with memoryStorage (Mandate #5 constraints)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper: Cryptographically Generating 6-Digit Shop Code
async function generateShopCode(socketId) {
  try {
    // 1. Remove old mapping if exists
    const existingCode = await redis.get(`shop:${socketId}:code`);
    if (existingCode) {
      await redis.del(`code:${existingCode}`);
    }

    // 2. Cryptographic random generation (Strict Mandate)
    const code = crypto.randomInt(100000, 1000000).toString();

    // 3. Write strict 60s TTL to Redis
    if (isUpstash) {
      await redis.set(`shop:${socketId}:code`, code, { ex: 60 });
      await redis.set(`code:${code}`, socketId, { ex: 60 });
    } else {
      const pipeline = redis.pipeline();
      pipeline.set(`shop:${socketId}:code`, code, 'EX', 60);
      pipeline.set(`code:${code}`, socketId, 'EX', 60);
      await pipeline.exec();
    }
    
    return code;
  } catch (err) {
    console.error(`[Redis] Error generating shop code:`, err);
    return null;
  }
}

// Phase 2 API: The Secure Upload Handshake (Multi-File Support — up to 10 files)
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { pairingCode, settings } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Missing files." });
    }
    if (!pairingCode || !settings) {
      return res.status(400).json({ error: "Missing pairingCode or settings." });
    }

    // Verify 6-digit code in Redis
    const shopSocketId = await redis.get(`code:${pairingCode}`);
    if (!shopSocketId) {
      return res.status(404).json({ error: "Invalid or expired 6-digit code." });
    }

    // Generate 32-byte Cryptographic Print Token
    const printToken = crypto.randomBytes(32).toString('hex');
    
    let parsedSettings;
    try {
      parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    } catch(e) {
      parsedSettings = settings;
    }

    const processedFiles = req.files.map(f => ({
        fileBase64: f.buffer.toString('base64'),
        mimeType: f.mimetype
    }));
    
    const payload = JSON.stringify({
      shopSocketId: shopSocketId,
      files: processedFiles,
      settings: parsedSettings
    });

    if (isUpstash) {
      // Save file payload to Redis (300s TTL)
      await redis.set(`token:${printToken}`, payload, { ex: 300 });
      // Immediately invalidate the pairingCode (One-Time Use)
      await redis.del(`code:${pairingCode}`);
      await redis.del(`shop:${shopSocketId}:code`);
    } else {
      const pipeline = redis.pipeline();
      // Save file payload to Redis (300s TTL)
      pipeline.set(`token:${printToken}`, payload, 'EX', 300);
      // Immediately invalidate the pairingCode (One-Time Use)
      pipeline.del(`code:${pairingCode}`);
      pipeline.del(`shop:${shopSocketId}:code`);
      await pipeline.exec();
    }

    // Secure Push: specific emit targeting shopSocketId (No Broadcasts permitted cross-talk)
    io.to(shopSocketId).emit('document_incoming', {
      printToken: printToken,
      files: processedFiles,
      settings: parsedSettings
    });

    console.log(`[Upload API] Securely routed ${processedFiles.length} file(s) to Shop ${shopSocketId} via Token ${printToken.slice(0,6)}...`);

    return res.status(200).json({
      success: true,
      message: `${processedFiles.length} document(s) securely routed to printer.`
    });

  } catch (error) {
    // Capture multer limitation errors automatically
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: "Payload Too Large." });
    }
    console.error("[Upload API] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Phase 2 Socket.io Event Handling
io.on('connection', async (socket) => {
  console.log(`[Socket] New connection established: ${socket.id}`);

  // 1. Initial 60s Shop Code generation upon idle connection
  const initialCode = await generateShopCode(socket.id);
  if (initialCode) {
    socket.emit('pairing_code_generated', { code: initialCode, expiresIn: 60 });
  }

  // 2. Automatic refresh request (ttl elapsed client side)
  socket.on('request_new_code', async () => {
    console.log(`[Socket] Shop ${socket.id} requested new code.`);
    const newCode = await generateShopCode(socket.id);
    if (newCode) {
      socket.emit('pairing_code_generated', { code: newCode, expiresIn: 60 });
    }
  });

  // 3. The Kill Switch
  socket.on('print_completed', async (data) => {
    if (data && data.printToken) {
      console.log(`[Socket] Print completed for Token: ${data.printToken.slice(0,6)}... Executing Kill Switch.`);
      await redis.del(`token:${data.printToken}`);
    }
  });

  // 4. Security Edge Case Cleanup
  socket.on('disconnect', async () => {
    console.log(`[Socket] Connection dropped: ${socket.id}`);
    const existingCode = await redis.get(`shop:${socket.id}:code`);
    if (existingCode) {
       if (isUpstash) {
        await redis.del(`shop:${socket.id}:code`);
        await redis.del(`code:${existingCode}`);
       } else {
        const pipeline = redis.pipeline();
        pipeline.del(`shop:${socket.id}:code`);
        pipeline.del(`code:${existingCode}`);
        await pipeline.exec();
       }
       console.log(`[Socket] Cleaned up code ${existingCode} for dropped socket`);
    }
  });
});

// Global multer error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: "Payload Too Large." });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=> Secure Printout backend running on port ${PORT}`);
});
