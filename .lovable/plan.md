## Objectivo

Replicar as duas abas do painel GrokGG (https://grokgg.space/dashboard) — **Integrações** e **Produtos** — no RedoxPay, mantendo o nosso design system, o backend Lovable Cloud e a integração com a RLX.

## Abas a replicar

### 1) Integrações (`/dashboard/integrations`)

Cards (toggle on/off + "Testar" por integração + botão único "Salvar Integrações"):

1. **Notificações Push (Web App)** — botão "Ativar notificações" (já existe; mantém).
2. **Personalizar Notificação Push** — Título, Moeda do valor (MZN/BRL/USD/EUR), Mensagem (corpo) com variáveis `{valor}`, `{produto}`, `{cliente}`, botão "Guardar personalização".
3. **PUSHcut** — Webhook URL + Testar.
4. **UTMify** — API Token (password) + Testar (já temos parcial; refina).
5. **MozeSMS** — Sender ID, Modelo de SMS com variáveis `{nome}`, `{produto}`, `{valor}`, `{email}`, Número para teste SMS (+258) + Testar.

Persistência em `integration_settings` (campos JSON `push_custom`, `pushcut`, `utmify`, `mozesms`, `enabled_*`).

Disparo automático no webhook RLX (`/api/public/rlx-webhook`) quando uma venda é aprovada: envia push (Web Push), POST ao PUSHcut, POST UTMify, POST MozeSMS — tudo opcional, controlado pelos toggles.

### 2) Produtos (`/dashboard/products`)

Lista (igual à actual): cartão com imagem, nome, preço, slug, botões abrir/duplicar/editar/toggle/excluir.

**Modal "Novo Produto" em 2 passos**:

**Passo 1 — Tipo de produto** (4 cartões):
- Link externo (entrega manual via URL)
- Produto digital (PDF/ZIP na área de membros)
- Produto físico (pede endereço, gera código de rastreio)
- Captura de leads (grátis, sem pagamento)

**Passo 2 — Formulário com 3 abas** (Básico / Entrega / Avançado) e seis pílulas de feature toggles (Pagamento, Checkout, Tracking, Testes A/B, Personalização, Order Bumps, Upsells, Prova Social, Recuperação, Assistente IA):

- **Básico**: Tipo (com "Alterar"), Imagem (upload bucket `product-images`), Nome, Slug (`grokgg.space/...` → no nosso domínio), Descrição, Preço (MZN), Desconto saldo (%).
- **Entrega**: Link de Obrigado (redireccionamento após pagamento). Para Digital: upload de ficheiro; para Físico: campos de envio; para Leads: redireccionamento.
- **Avançado**: Sender ID (select), Modelo de Mensagem SMS por produto.

Cada pílula abre um dialog secundário com a sua configuração (todas guardadas em `products.config jsonb`):

- **Pagamento**: métodos aceites (M-Pesa, e-Mola, RLX), permitir parcelas, valor mínimo.
- **Checkout**: cores, logo, campos pedidos (nome, email, telefone, NUIT, endereço).
- **Tracking**: Facebook Pixel ID, Google Ads ID, GTM ID, eventos custom.
- **Testes A/B**: 2 variantes de checkout com % de tráfego.
- **Personalização**: cabeçalho, badges de prova social, contador escassez.
- **Order Bumps**: até 3 produtos extra mostrados no checkout.
- **Upsells**: 1-clique pós-compra, encadeamento.
- **Prova Social**: feed de vendas recentes no checkout.
- **Recuperação**: SMS/email para carrinho abandonado.
- **Assistente IA**: gerar descrição + título com Lovable AI Gateway.

## Esquema da base de dados (migrações)

```sql
-- products: novas colunas
ALTER TABLE products
  ADD COLUMN product_type text NOT NULL DEFAULT 'external'
    CHECK (product_type IN ('external','digital','physical','lead')),
  ADD COLUMN thank_you_url text,
  ADD COLUMN discount_no_balance numeric DEFAULT 0,
  ADD COLUMN digital_file_path text,
  ADD COLUMN sms_sender_id text,
  ADD COLUMN sms_template text,
  ADD COLUMN config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- integration_settings: campos novos
ALTER TABLE integration_settings
  ADD COLUMN push_custom jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN pushcut jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN utmify jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN mozesms jsonb DEFAULT '{}'::jsonb;
```

Mantém RLS + GRANTs existentes.

## Ficheiros a criar/editar

**Novos componentes**:
- `src/components/products/new-product-dialog.tsx` (wizard 2-passos)
- `src/components/products/product-feature-dialogs.tsx` (Pagamento, Checkout, Tracking, A/B, Personalização, OrderBumps, Upsells, ProvaSocial, Recuperação, AssistenteIA)
- `src/components/integrations/integration-card.tsx` (card reutilizável)

**Server functions** (novas/expandidas):
- `src/lib/products.functions.ts` — add `createProductV2`, `updateProductConfig`, `aiGenerateDescription`
- `src/lib/integrations.functions.ts` — add `testPushcut`, `testUtmify`, `testMozesms`, `sendTestSms`
- `src/lib/push.functions.ts` — usa `push_custom` para o conteúdo
- `src/routes/api/public/rlx-webhook.ts` — dispara PUSHcut/UTMify/MozeSMS por venda

**Páginas**:
- `src/routes/_authenticated/dashboard.integrations.tsx` — reescrita
- `src/routes/_authenticated/dashboard.products.tsx` — reescrita (lista + abre wizard)

**Storage**:
- Bucket `product-images` já existe; adicionar bucket `product-digital` (privado) para Produto Digital.

## O que **não** está no âmbito

- Importar logos/marca registada do GrokGG (PUSHcut, UTMify, MozeSMS) — usamos ícones genéricos próximos.
- Replicar a aba "IA & Insights" do GrokGG (é outro menu, não foi pedido).
- Substituir a lógica de taxas — mantém-se `src/lib/fees.ts` (15%+15 vendedor, 10%+10 RLX, 5%+5 plataforma).
