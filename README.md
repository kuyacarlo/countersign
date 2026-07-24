# countersign.

Competition spike for Base44 Dev Build-Off (Jul 21–28 2026).

**Pitch:** A claim stays gray until a named person countersigns. Reject or expire — it stays fake.

**Auth / demo:** https://countersign-c93a8b96.base44.app  
**Mirror (Vercel):** https://countersign-five.vercel.app — Google/signup can fail here; Base44 only trusts `*.base44.app` (and paid custom domains).  
**GitHub:** https://github.com/kuyacarlo/countersign  
**Dashboard:** https://app.base44.com/apps/6a62f603c1dbaee5c93a8b96/editor/workspace/overview

## Stack

- React + Vite + Tailwind (pnpm)
- Base44: auth (email + Google), `Claim` entity, realtime subscribe, `expireUnsigned` function

## Loop

1. Sign in (email/password or Google — not platform `/login`)
2. Post a claim naming a reviewer email → `pending`, expires in 48h
3. Reviewer countersigns → `signed` (or reject → `rejected`)
4. Live wall via entity subscribe
5. `expireUnsigned` marks overdue pending as `expired` (invoked on load; schedule via dashboard **Workflows** — legacy automations are disabled on this app)

## Develop

```bash
pnpm install
pnpm dev
```

## Deploy

```bash
pnpm dlx base44 entities push
pnpm dlx base44 auth push --yes
pnpm dlx base44 agents push
pnpm dlx base44 functions deploy
pnpm build && pnpm dlx base44 site deploy --yes
```

App ID lives in `base44/.app.jsonc` (gitignored).

## Demo (2 accounts)

1. A posts claim naming B → stays gray  
2. B opens **my inbox** → Countersign → signed live  
3. Or leave past `expires_at` and refresh to expire  

Disposable after the contest unless domain-locked later.
