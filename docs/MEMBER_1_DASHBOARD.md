# Member 1 — Dashboard Developer Context

**Your role:** Build and enhance the React dashboard that displays Git diagnostics and recovery progress in real-time.

---

## What's Already Done

✅ Basic dashboard page with dark dev-tool aesthetic  
✅ Mock data for all UI components  
✅ Tailwind CSS + Lucide icons configured  
✅ Socket.IO client stub with event handlers  
✅ TypeScript types imported from `@git-cure/shared`  

---

## Your Workspace

**Primary directory:** `apps/dashboard/`

```
apps/dashboard/
├── src/
│   ├── pages/
│   │   └── OverviewPage.tsx          # Main dashboard (edit this)
│   ├── components/
│   │   └── ui/
│   │       └── StatusDot.tsx         # Reusable status indicator
│   ├── services/
│   │   ├── socket.ts                 # Socket.IO client (integrate here)
│   │   └── api.ts                    # REST fallback (if needed)
│   ├── data/
│   │   └── mockData.ts               # Mock data (replace with real data)
│   ├── types/
│   │   └── index.ts                  # Local type extensions
│   ├── App.tsx                       # Root component
│   └── main.tsx                      # Entry point
├── public/                           # Static assets
├── package.json
└── vite.config.ts
```

---

## Your Tasks

### Phase 1: Real-time Integration (Priority)

**Replace mock data with Socket.IO events:**

1. **Read** `services/socket.ts` to understand the event structure
2. **Create** React state management (Context API or Zustand recommended)
3. **Wire up** the socket event listeners to update state:
   - `repo:status:updated` → Update repository status
   - `diagnosis:ready` → Update diagnosis panel
   - `recovery:plan:ready` → Load recovery steps
   - `recovery:step:changed` → Update individual step status
   - `snapshot:created` → Update snapshot status
   - `log:appended` → Append to execution log
   - `verification:complete` → Update verification results

4. **Connect** the socket when the dashboard loads:
   ```typescript
   useEffect(() => {
     socket.connect();
     return () => socket.disconnect();
   }, []);
   ```

### Phase 2: Interactive Features

**Add user interactions:**

1. **Approval button** for steps with `status: "awaiting-approval"`
   - Call `grantApproval(stepId)` from `services/socket.ts`
   - Show visual feedback when approval is sent
   - Disable button after approval

2. **Log filtering** (info/warn/error/debug toggles)

3. **Copy command** button for each recovery step

4. **Snapshot rollback** UI (if time permits)

### Phase 3: Polish

1. **Connection status indicator**
   - Show `socket.connected` state in top bar
   - Replace "mock data" badge with real connection status
   - Add reconnection feedback

2. **Loading states**
   - Skeleton screens while waiting for initial data
   - Smooth transitions when data updates

3. **Responsive layout**
   - Test on different screen sizes
   - Ensure terminal log is readable on narrow screens

---

## Key Files to Read First

1. `packages/shared/src/types.ts` — Data contracts (TypeScript interfaces)
2. `services/socket.ts` — Socket.IO client and event names
3. `data/mockData.ts` — Example data structure
4. `docs/API_CONTRACT.md` — Complete data schemas

---

## Development Commands

```bash
# Start dev server (from project root)
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck
```

Dev server: http://localhost:5173

---

## Integration Points

**With Member 2 (CLI):**
- They emit events via the server → your socket receives them
- You send approval events → server forwards to CLI
- No direct communication needed

**With Member 3 (Gemma):**
- They generate `DiagnosticResult` → CLI sends it → you display it
- You never call Gemma directly

---

## Design Guidelines

- **Font:** Monospace only (JetBrains Mono is loaded)
- **Colors:** Use Tailwind's `gc-*` custom colors (defined in config)
- **Animations:** Minimal — blinking cursor on wordmark, spinner on running steps only
- **Status colors:**
  - Green (`gc-accent`) → success, low risk
  - Amber (`gc-warn`) → moderate risk, awaiting approval
  - Red (`gc-danger`) → high risk, errors

---

## Common Pitfalls

❌ **Don't** execute Git commands from the dashboard  
❌ **Don't** modify `packages/shared/src/types.ts` without team agreement  
❌ **Don't** import from `packages/cli` or `services/gemma`  
✅ **Do** keep the UI read-only and presentation-focused  
✅ **Do** handle socket disconnection gracefully  
✅ **Do** validate incoming data before rendering  

---

## Testing Locally (Without CLI Running)

The socket client will log connection errors in the console — this is expected.  
Use mock data from `data/mockData.ts` until Member 2 has the server running.

Once the server is live:
1. Set `VITE_API_BASE_URL=http://localhost:7432` in `.env` (if needed)
2. Socket will auto-connect to the server
3. Real events will flow through

---

## Git Workflow

**Branch naming:** `feat/dashboard-<feature-name>`

Example:
```bash
git checkout -b feat/dashboard-socket-integration
# ... make changes ...
git add .
git commit -m "Connect dashboard to Socket.IO real-time events"
git push origin feat/dashboard-socket-integration
```

Then create a PR to `main` for team review.

---

## Questions?

- Check `docs/TEAM_WORKFLOW.md` for module boundaries
- Check `docs/ARCHITECTURE.md` for system design
- Ask Member 2 about CLI event timing
- Ask Member 3 about diagnosis data structure

---

## Current Status

✅ Dashboard renders with mock data  
⏳ Socket.IO integration (your task)  
⏳ Approval workflow (your task)  
⏳ Real-time log streaming (your task)

**Start here:** Wire up socket events in `OverviewPage.tsx` or create a global state manager.
