# countersign.

Competition spike for Base44 Dev Build-Off (Jul 21–28 2026).

**Pitch:** A claim stays gray until a named person countersigns. Reject or expire — it stays fake.

## Stack

- React + Vite + Tailwind (pnpm)
- Base44: auth, `Claim` entity, realtime subscribe, `expire-unsigned` cron function

## Develop

```bash
pnpm install
pnpm dev
```

Auth uses in-app email/password or Google via `loginWithProvider` (not platform `/login`).

## Deploy

```bash
pnpm dlx base44 entities push
pnpm dlx base44 auth push --yes
pnpm dlx base44 functions deploy
pnpm build && pnpm dlx base44 site deploy --yes
# or
pnpm dlx base44 deploy --yes
```

App ID: see `base44/.app.jsonc` (gitignored).

## Demo

1. Two browsers / two accounts  
2. A posts claim naming B as reviewer → gray  
3. B countersigns → live wall turns signed  
4. Or wait / run expire for timeout  

Disposable after the contest unless domain-locked later.
