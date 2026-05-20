/**
 * Global Cmd+K / Ctrl+K command palette for the IkigaiTradeOS cockpit.
 *
 * Mounts once at the App root. Hooks a global keydown listener to toggle open.
 * Sections:
 *   - Navigation -- wouter routes (Home, Engines, Connections, Reports, Archive, Upload, Admin)
 *   - Engines    -- quick actions (scan all, show HELIOS, show Schwab health)
 *   - Actions    -- emergency stop (opens KillSwitchConfirm)
 *   - Links      -- external dashboards (AXE Command Pro, Schwab Bridge Health)
 *
 * Recent commands (last 5 ids) persist to localStorage and surface as a top
 * group when present. cmdk's built-in fuzzy filter handles search.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import KillSwitchConfirm from "./KillSwitchConfirm";

const RECENT_KEY = "ikigai.cmdk.recent.v1";
const RECENT_MAX = 5;

type CommandId =
  | "nav.home"
  | "nav.engines"
  | "nav.connections"
  | "nav.reports"
  | "nav.archive"
  | "nav.upload"
  | "nav.admin"
  | "engine.scan-all"
  | "engine.helios-status"
  | "engine.schwab-health"
  | "action.kill-all"
  | "link.axe-pro"
  | "link.schwab-bridge-health";

interface CommandDef {
  id: CommandId;
  label: string;
  hint?: string;
  group: "Navigation" | "Engines" | "Actions" | "Links";
  run: () => void;
}

function readRecent(): CommandId[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is CommandId => typeof x === "string") as CommandId[];
  } catch {
    return [];
  }
}

function writeRecent(ids: CommandId[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch {
    // localStorage may throw in private mode -- non-fatal
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [recent, setRecent] = useState<CommandId[]>(() => readRecent());
  const [, navigate] = useLocation();

  // Global Cmd+K / Ctrl+K toggle. Suppress when the user is typing into an
  // editable element so we don't steal Cmd+K from native fields.
  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return t.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K";
      if (!isK) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Allow Cmd+K inside editable fields too -- this is a command palette,
      // so the user expects it everywhere. Comment out the next two lines to
      // re-enable suppression.
      void isEditableTarget;
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pushRecent = useCallback((id: CommandId) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_MAX);
      writeRecent(next);
      return next;
    });
  }, []);

  const runAndClose = useCallback(
    (id: CommandId, fn: () => void) => {
      pushRecent(id);
      setOpen(false);
      // Defer so the dialog close animation does not eat focus from the next view.
      window.setTimeout(fn, 0);
    },
    [pushRecent],
  );

  const openExternal = (url: string) => () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const commands: CommandDef[] = [
    // Navigation
    {
      id: "nav.home",
      label: "Home",
      group: "Navigation",
      run: () => navigate("/"),
    },
    {
      id: "nav.engines",
      label: "Engines",
      group: "Navigation",
      run: () => navigate("/engines"),
    },
    {
      id: "nav.connections",
      label: "Connections",
      group: "Navigation",
      run: () => navigate("/connections"),
    },
    {
      id: "nav.reports",
      label: "Reports",
      group: "Navigation",
      run: () => navigate("/report-archive"),
    },
    {
      id: "nav.archive",
      label: "Archive",
      group: "Navigation",
      run: () => navigate("/archive"),
    },
    {
      id: "nav.upload",
      label: "Upload",
      group: "Navigation",
      run: () => navigate("/upload"),
    },
    {
      id: "nav.admin",
      label: "Admin",
      group: "Navigation",
      run: () => navigate("/admin"),
    },

    // Engines
    {
      id: "engine.scan-all",
      label: "Scan all engines now",
      group: "Engines",
      run: () => {
        navigate("/engines");
        toast.info("Engine scan requested", {
          description: "Trigger the scan from the Engines panel.",
        });
      },
    },
    {
      id: "engine.helios-status",
      label: "Show HELIOS status",
      group: "Engines",
      run: () => navigate("/engines?engine=helios"),
    },
    {
      id: "engine.schwab-health",
      label: "Show Schwab health",
      group: "Engines",
      run: () => navigate("/connections?focus=schwab"),
    },

    // Actions
    {
      id: "action.kill-all",
      label: "KILL ALL (emergency stop)",
      hint: "destructive",
      group: "Actions",
      run: () => setKillOpen(true),
    },

    // Links
    {
      id: "link.axe-pro",
      label: "Open AXE Command Pro",
      group: "Links",
      run: openExternal("http://localhost:18800/v3/pro"),
    },
    {
      id: "link.schwab-bridge-health",
      label: "Open Schwab Bridge Health",
      group: "Links",
      run: openExternal(
        "https://trading-strategy-options-production.up.railway.app/health/schwab",
      ),
    },
  ];

  const byId = new Map<CommandId, CommandDef>(commands.map((c) => [c.id, c]));
  const recentCommands = recent
    .map((id) => byId.get(id))
    .filter((c): c is CommandDef => Boolean(c));

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Palette"
        description="Search for a command to run."
      >
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          {recentCommands.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentCommands.map((cmd) => (
                  <CommandItem
                    key={`recent-${cmd.id}`}
                    value={`recent ${cmd.label}`}
                    onSelect={() => runAndClose(cmd.id, cmd.run)}
                  >
                    <span>{cmd.label}</span>
                    {cmd.hint === "destructive" && (
                      <CommandShortcut className="font-mono text-red-500">
                        danger
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {(["Navigation", "Engines", "Actions", "Links"] as const).map((group) => {
            const items = commands.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => runAndClose(cmd.id, cmd.run)}
                    className={
                      cmd.hint === "destructive"
                        ? "data-[selected=true]:bg-red-500/15 text-red-500"
                        : undefined
                    }
                  >
                    <span>{cmd.label}</span>
                    {cmd.hint === "destructive" && (
                      <CommandShortcut className="font-mono text-red-500">
                        danger
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>

      <KillSwitchConfirm open={killOpen} onOpenChange={setKillOpen} />
    </>
  );
}

/**
 * Small helper hint chip. Render this in the layout / status bar so users
 * discover the palette. Mono font matches the spec request for JetBrains-style
 * keyboard shortcut hints (Tailwind exposes `font-mono` which inherits the
 * project font stack -- update tailwind config to add JetBrains Mono if you
 * want it literal).
 */
export function CommandPaletteHint({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  const combo = isMac ? "Cmd+K" : "Ctrl+K";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground " +
        (className ?? "")
      }
      aria-label="Open command palette"
    >
      <kbd className="font-mono">{combo}</kbd>
      <span className="opacity-60">command palette</span>
    </span>
  );
}
