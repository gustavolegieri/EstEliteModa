# Deploy — Mercado Pago Checkout Pro (Produção)

Este projeto usa:

- **Frontend:** Vite/React (`npm run dev` / build estático)
- **Backend pagamentos:** `server.js` (Express + SDK Mercado Pago)

O token **nunca** vai para o frontend. Apenas `MERCADO_PAGO_ACCESS_TOKEN` no servidor.

---

## 1. Subir API no Railway

1. Crie conta em [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub** (ou upload deste repositório)
3. Railway detecta `railway.json` e usa `npm run start`
4. Em **Variables**, adicione:

| Variável | Valor |
|----------|--------|
| `MERCADO_PAGO_ACCESS_TOKEN` | `APP_USR-...` (seu access token) |
| `MERCADO_PAGO_PUBLIC_KEY` | `APP_USR-...` (sua public key) |
| `FRONTEND_URL` | `https://estelite.lovable.app` (ou seu domínio) |
| `CORS_ORIGINS` | `https://seudominio.com` (opcional, se domínio extra) |
| `PORT` | Deixe Railway definir automaticamente |

5. Em **Settings → Networking**, gere o domínio público, ex:
   `https://estelite-api-production.up.railway.app`

6. Teste:
   ```bash
   curl https://SUA-API.railway.app/health
   ```
   Resposta esperada: `{"ok":true,"status":"OK",...}`

---

## 2. Publicar frontend (Lovable / Vercel / Netlify)

No **build** do frontend, defina:

```env
VITE_API_URL=https://SUA-API.railway.app
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_MP_PUBLIC_KEY=APP_USR-...
```

> **Importante:** `VITE_*` é embutido no build. Alterou a URL da API → faça **novo deploy** do frontend.

### Lovable

1. Project Settings → Environment Variables
2. Adicione `VITE_API_URL` com a URL Railway (sem barra no final)
3. Redeploy / Publish

### Domínio customizado

1. Aponte DNS do domínio para Lovable/hosting do frontend
2. Atualize no Railway:
   - `FRONTEND_URL=https://www.seudominio.com`
   - `CORS_ORIGINS=https://www.seudominio.com,https://seudominio.com`

---

## 3. Mercado Pago — URLs de retorno

O `server.js` envia automaticamente:

- **success:** `{FRONTEND_URL}/payment-success`
- **failure:** `{FRONTEND_URL}/pricing?payment=failed`

Em desenvolvimento local, se o browser estiver em `localhost`, o servidor usa `FRONTEND_URL` de produção para `back_urls` (exigência do MP em credenciais de produção).

---

## 4. Desenvolvimento local

**Terminal 1:**
```bash
npm run server
```

**Terminal 2:**
```bash
npm run dev
```

- API: `http://localhost:3001`
- Frontend: `http://localhost:8080`
- Checkout: `/pricing` → **Assinar Agora**

`.env` local (raiz):

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
FRONTEND_URL=https://estelite.lovable.app
VITE_API_URL=
```

Com `VITE_API_URL` vazio, o frontend usa fallback `http://localhost:3001`.

---

## 5. Testar após deploy

1. `GET https://SUA-API/health` → `ok: true`
2. Abra o site em produção (desktop e celular)
3. Login → `/pricing` → **Assinar Agora**
4. Deve abrir `mercadopago.com.br/checkout`
5. Após pagamento teste, retorno em `/payment-success`

---

## 6. Render (alternativa ao Railway)

1. New **Web Service** → conecte o repo
2. **Build:** `npm install`
3. **Start:** `npm run start`
4. Mesmas variáveis de ambiente da tabela acima
5. Use a URL Render em `VITE_API_URL`

---

## 7. Checklist rápido

- [ ] API no ar (`/health` OK)
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` no Railway
- [ ] `FRONTEND_URL` = domínio real do site
- [ ] `VITE_API_URL` no build do frontend = URL da API
- [ ] Novo deploy do frontend após mudar env
- [ ] Teste mobile (Safari/Chrome)
