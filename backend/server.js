import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log("MP RESULT:", result);

const MP_ACCESS_TOKEN =
  process.env.MERCADO_PAGO_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.VITE_APP_URL ||
  'https://estelite.lovable.app';

const PLANS = {
  essencial: { id: 'essencial', title: 'Plano Essencial', unit_price: 49 },
  premium: { id: 'premium', title: 'Plano Premium', unit_price: 97 },
  elite: { id: 'elite', title: 'Plano Elite', unit_price: 147 },
};

function resolvePlan(input) {
  if (!input) return null;
  const key = String(input).toLowerCase().trim();
  if (PLANS[key]) return PLANS[key];
  if (key.includes('essencial')) return PLANS.essencial;
  if (key.includes('elite')) return PLANS.elite;
  if (key.includes('premium')) return PLANS.premium;
  return null;
}

function buildAllowedOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const defaults = [
    FRONTEND_URL,
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8080',
    'https://estelite.lovable.app',
  ];

  return [...new Set([...fromEnv, ...defaults].map((o) => o.replace(/\/$/, '')))];
}

const allowedOrigins = buildAllowedOrigins();

app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      const allowed = allowedOrigins.some(
        (o) => normalized === o || normalized.startsWith(o),
      );
      callback(null, allowed);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));

const mpClient = MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
  : null;
const preferenceClient = mpClient ? new Preference(mpClient) : null;

app.get('/', (_req, res) => {
  res.json({
    service: 'estelite-payments',
    status: 'ok',
    endpoints: ['GET /health', 'POST /create-preference'],
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'OK',
    mercadopago: Boolean(MP_ACCESS_TOKEN),
    timestamp: new Date().toISOString(),
  });
});

app.post('/create-preference', async (req, res, next) => {
  try {
    if (!preferenceClient) {
      return res.status(503).json({
        error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado',
      });
    }

    const {
      plan,
      planId,
      planName,
      priceCents,
      userId,
      userEmail,
      returnBaseUrl,
    } = req.body ?? {};

    let resolved = resolvePlan(plan) || resolvePlan(planName);

    if (!resolved && planId && priceCents) {
      resolved = {
        id: String(planId),
        title: String(planName || 'Plano'),
        unit_price: Number(priceCents) / 100,
      };
    }

    if (!resolved) {
      return res.status(400).json({
        error: 'Plano inválido. Use: essencial, premium ou elite',
      });
    }

    let base = String(returnBaseUrl || FRONTEND_URL).replace(/\/$/, '');

    if (
      (base.includes('localhost') || base.includes('127.0.0.1')) &&
      FRONTEND_URL &&
      !FRONTEND_URL.includes('localhost')
    ) {
      base = FRONTEND_URL.replace(/\/$/, '');
    }

    const isLocal = base.includes('localhost') || base.includes('127.0.0.1');

    const externalRef = userId
      ? `${userId}:${resolved.id}`
      : `guest:${resolved.id}:${Date.now()}`;

    const preferenceBody = {
      items: [
        {
          id: resolved.id,
          title: resolved.title,
          quantity: 1,
          unit_price: resolved.unit_price,
          currency_id: 'BRL',
        },
      ],
      payer: userEmail ? { email: String(userEmail) } : undefined,
      external_reference: externalRef,
      back_urls: {
        success: `${base}/payment-success`,
        failure: `${base}/pricing?payment=failed`,
        pending: `${base}/payment-success?status=pending`,
      },
      statement_descriptor: 'EST ELITE',
    };

    if (!isLocal) {
      preferenceBody.auto_return = 'approved';
    }

    const result = await preferenceClient.create({ body: preferenceBody });

    if (!result?.init_point && !result?.sandbox_init_point) {
      return res.status(502).json({
        error: 'Mercado Pago não retornou URL de checkout',
      });
    }

    return res.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (e) {
    next(e);
  }
});

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  const message =
    err?.cause?.[0]?.description ||
    err?.message ||
    'Erro interno do servidor';
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] FRONTEND_URL=${FRONTEND_URL}`);
  console.log(`[server] CORS origins: ${allowedOrigins.join(', ')}`);
  if (!MP_ACCESS_TOKEN) {
    console.warn('[server] MERCADO_PAGO_ACCESS_TOKEN ausente');
  }
});

export default app;
