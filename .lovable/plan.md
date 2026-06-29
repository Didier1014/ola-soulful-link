# Aba Merchants + Split de Pagamentos

## O que vou construir

### 1. Base de dados (migração)
Nova tabela `merchants` (pertence ao dono da plataforma — `owner_id`):

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid → auth.users | dono que criou |
| name | text | obrigatório |
| email | text | opcional |
| payout_mpesa | text | 84/85xxxxxxx, opcional |
| payout_emola | text | 86/87xxxxxxx, opcional |
| client_id | text único | gerado: `CLI_XXXNNN` |
| api_key | text único | gerado: `mrc_live_<hex>` |
| active | bool default true | |
| created_at / updated_at | timestamptz | |

CHECK: pelo menos um dos dois números preenchido. RLS: apenas o `owner_id` lê/escreve os seus merchants. GRANTs normais + admin.

Nova tabela `merchant_transactions` para o log do split:
`id, merchant_id, owner_id, payer_phone, method, gross, platform_fee, rlx_cost, owner_profit, merchant_net, provider_phone, merchant_phone, status (pending|success|failed), rlx_txid, rlx_response jsonb, created_at`.

Seed: Gercio Sitoe e Race Armindo Felix pré-carregados para o primeiro admin que abrir a aba (se ainda não existirem).

### 2. Backend — `src/lib/merchants.functions.ts`
- `listMerchants` — lista do owner
- `createMerchant` — valida números (regex 84/85 mpesa, 86/87 emola), gera `client_id` + `api_key`
- `updateMerchant` — toggle activo, editar números/nome
- `revokeApiKey` — gera nova api_key
- `getMerchant` — detalhe + últimas 50 merchant_transactions
- `processMerchantPayment` — fluxo completo:
  1. carrega merchant, valida `active`
  2. `calcSplit(amount, method)` (helper em `src/lib/split.ts`)
  3. escolhe `merchantPhone` pelo método (fallback para o outro se não tiver)
  4. POST RLX `action: "pay"` com `splits: [{provider, ownerProfit}, {merchant, merchantNet}]`
  5. grava `merchant_transactions` com breakdown completo e `rlx_response`
  6. retorna resultado

### 3. Helper `src/lib/split.ts`
```ts
export const PROVIDERS = { mpesa: "847389419", emola: "875844372" };
export function calcSplit(amount, method) { ... }  // exactamente a fórmula do brief
```

### 4. UI — nova rota `/dashboard/merchants`
- `src/routes/_authenticated/dashboard.merchants.tsx` — tabela: Nome | M-Pesa | E-Mola | Client ID | Estado | Acções (ver, toggle, eliminar). Botão "Novo merchant" abre Dialog com form validado.
- `src/routes/_authenticated/dashboard.merchants.$id.tsx` — detalhe: cards com payout phones (copiar), Client ID, API key oculta (mostrar/copiar/revogar), toggle activo, **simulador de split ao vivo** (input valor + método → mostra breakdown), tabela das últimas transacções com breakdown por linha.
- Adicionar item "Merchants" no sidebar de `src/routes/_authenticated/route.tsx` (ícone `Store`).

### 5. Validações
- amount mínimo 50 MT
- merchant inactivo → erro claro
- merchant sem número do método → fallback automático para o outro
- RLX falha/timeout → status `pending`, mantém row para retry

## Detalhes técnicos

- Stack já existente: TanStack Start + `createServerFn` + Supabase RLS. Sem edge functions.
- RLX já está integrado em `src/lib/rlx.server.ts`. Vou estender `rlxPay` para aceitar `splits?: Array<{phone, amount}>` (passa directamente no payload).
- Componentes shadcn já em uso (Dialog, Table, Switch, Input, Button). Sem libs novas.
- Tudo em PT-PT, tom alinhado com o resto do app.
- `processMerchantPayment` exposto para uso futuro pela API pública (rota `/api/public/merchants/charge` autenticada por `api_key` do merchant) — deixo a função pronta mas a rota fica para a próxima iteração se não quiseres já.

## Fora de scope (avisar)

- Não toco no fluxo actual de `createCheckout` / `payLink` (continuam a creditar o vendedor logado). O split novo é um fluxo paralelo via `processMerchantPayment`, para os merchants do dono da plataforma.
- Rota pública autenticada por api_key fica preparada mas não criada nesta iteração — diz se queres já.

Posso avançar?
