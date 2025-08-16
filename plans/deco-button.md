# ✨ Plan: Deco Sign-In / Profile Button with Debug Popover

> Replaces the current simple **Login** button with a richer, conceptual "Deco Button" that adapts to login state and provides a built-in developer debug panel.

---

## 1. Goals & UX

1. Unified button component:
   - **Logged-out** – shows label `Sign In` followed by Deco *d* logo (1×1 PNG from `public/d.png`).
   - **Logged-in** – shows label `@{username}` followed by same logo.
2. Click on **logged-in** button opens a **Popover** displaying:
   - **Profile section** (centered):
     - Name, E-mail, User ID (with copy icon).
   - **Debug section** (collapsed by default):
     - Heading: *Tool Calls*.
     - Simple table listing every RPC tool invocation made by the frontend, with copy buttons for input & output JSON.
3. Persist tool-call log **locally (localStorage)** for now so it survives reload but is strictly client-side.
4. Design should match existing Tailwind/shadcn aesthetics.

---

## 2. Data & State

| Concern | Solution |
|---------|----------|
| User session | Continue using `useOptionalUser()` / `useUser()` hooks. |
| Tool-call log | Direct persistence in RPC proxy to `localStorage`<br>• No context needed - proxy handles logging<br>• React components use `useToolCalls()` hook to read<br>• Console.log for debugging each call |
| Visibility (popover) | Use @radix Popover via shadcn/ui wrapper. |

---

## 3. Capturing Tool Calls

> We need a single interception point for **all** RPC calls made through `client`.

### 3.1 Proxy with Direct Persistence

```ts
// view/src/lib/rpc-logged.ts
import { client as rawClient } from "./rpc";

// Helper to persist tool calls directly in localStorage
const persistToolCall = (entry: any) => {
  const key = "toolCalls";
  const existing: any[] = JSON.parse(localStorage.getItem(key) ?? "[]");
  const updated = [...existing, entry];
  localStorage.setItem(key, JSON.stringify(updated));
  console.log("[tool-call]", entry); // Debug logging
  // Dispatch event for React components to refresh
  window.dispatchEvent(new CustomEvent("__tool_calls_updated"));
};

export const client = new Proxy(rawClient, {
  get(target, prop) {
    const orig = (target as any)[prop];
    if (typeof orig !== "function") return orig;
    return async function (...args: any[]) {
      const input = args[0];
      const output = await orig.apply(this, args);
      persistToolCall({ 
        timestamp: Date.now(), 
        tool: String(prop), 
        input, 
        output 
      });
      return output;
    };
  },
});
```

### 3.2 React Hook for Reading Tool Calls

```ts
// view/src/hooks/useToolCalls.ts
export const useToolCalls = () => {
  const [calls, setCalls] = useState(() => 
    JSON.parse(localStorage.getItem("toolCalls") ?? "[]")
  );
  
  useEffect(() => {
    const handler = () => 
      setCalls(JSON.parse(localStorage.getItem("toolCalls") ?? "[]"));
    window.addEventListener("__tool_calls_updated", handler);
    return () => window.removeEventListener("__tool_calls_updated", handler);
  }, []);
  
  return calls;
};
```

*No context provider needed - persistence happens directly in the proxy, UI reads from localStorage.*

---

## 4. Component Breakdown

1. **`DecoButton.tsx`**
   - Decides between *logged-out* and *logged-in* rendering.
   - Uses `Button` and `Popover` from shadcn.
2. **`ProfileCard.tsx`** – inside popover.
3. **`ToolCallsTable.tsx`** – inside Debug accordion.
4. **`useToolCalls.ts`** – hook to read tool calls from localStorage.
5. **`rpc-logged.ts`** – proxy client with persistence.
6. Replace imports of `client` in hooks with new proxy (one-line change).

---

## 5. Step-by-Step Implementation

1. **Create rpc proxy** with localStorage persistence and console.log.
2. **Update hooks** in `view/src/lib/hooks.ts` to `import { client } from "./rpc-logged";`.
3. **Create useToolCalls hook** to read from localStorage.
4. **Build DecoButton component** with popover and accordion.
5. **Swap** current login button occurrences (`home.tsx`, others) with `<DecoButton />`.
6. **Styling** – follow shadcn conventions; ensure dark-mode compatible.
7. **Testing**
   - Check console.log outputs for tool calls.
   - Manual UI test for popover / collapse.

---

## 6. Stretch / Future Work

- Persist tool calls to **IndexedDB** or server.
- Filter by time / tool / error.
- Clear log button.
- Export as JSON.
- Display request duration & tokens.

---

## 7. Acceptance Criteria

- [ ] Logged-out button matches design, navigates to `/oauth/start`.
- [ ] Logged-in button shows `@username` and opens popover.
- [ ] Popover shows profile & collapsible tool-call table.
- [ ] All frontend tool calls recorded in localStorage and displayed.
- [ ] No regressions in existing auth or RPC flows.
