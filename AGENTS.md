<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment workflow

- The app is deployed by the Vercel project `monologxbot/memento`.
- Treat each pull request's Vercel Preview deployment as that pull request's Stage environment. Use its dynamic Preview URL; there is intentionally no shared `staging` branch or permanent Stage URL.
- Every push to a pull request must produce a fresh Vercel Preview. Before handing off app work, confirm the latest Vercel check passes and share the current Preview URL.
- `main` is the Vercel Production Branch. Merging a pull request into `main` creates the Production deployment and updates the stable production aliases.
- Keep `package-lock.json` committed. Never commit `.env*`, `.vercel/`, `node_modules/`, or `.next/`.
- Run `npm run lint` and `npm run build` before committing app changes.
