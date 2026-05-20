/**
 * Two-step kill switch confirmation dialog.
 *
 * Step 1: Acknowledge the action -- requires the user to type "KILL" literally
 *         into a text input before the Continue button enables.
 * Step 2: Final confirmation -- single Activate button on a red alert.
 *
 * On Activate, POSTs to UTP /api/kill-switch/activate. The current UTP backend
 * only ships GET /api/kill-switch/status (see
 * unified-trading-platform/backend/api/routes/kill_switch.py); the activate
 * route is wired here in anticipation of the matching backend handler. If the
 * route 404s in production, the red toast will surface the error.
 *
 * After success, the global KillSwitchBanner picks up the lock_active flag
 * from the 10s status poll and shows the "KILL SWITCH ACTIVE" banner.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { utpPost, UtpApiError } from "@/lib/utpApi";

interface ActivateResponse {
  lock_active?: boolean;
  detail?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2;

export default function KillSwitchConfirm({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();

  // Reset on open/close.
  useEffect(() => {
    if (!open) {
      setStep(1);
      setPhrase("");
      setSubmitting(false);
    }
  }, [open]);

  const canProceed = phrase.trim().toUpperCase() === "KILL";

  async function onActivate() {
    setSubmitting(true);
    try {
      await utpPost<ActivateResponse>("/api/kill-switch/activate", {
        reason: "manual",
        source: "command-palette",
      });
      toast.success("Kill switch armed", {
        description: "UTP halted. All open orders queued for cancel.",
      });
      onOpenChange(false);
      navigate("/");
    } catch (err) {
      const detail =
        err instanceof UtpApiError
          ? `${err.status}: ${err.body || err.message}`
          : err instanceof Error
            ? err.message
            : "Unknown error";
      toast.error("Kill switch FAILED", { description: detail });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-red-500/40">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500">
                Stop all engines + cancel open orders?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This halts UTP and cancels open orders across every connected
                broker. Type <span className="font-mono font-bold">KILL</span>{" "}
                to enable the next step.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              autoFocus
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder='Type "KILL" to continue'
              className="font-mono"
              aria-label="Type KILL to continue"
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!canProceed || submitting}
                onClick={(e) => {
                  e.preventDefault();
                  setStep(2);
                }}
                className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500">
                This will halt UTP. Proceed?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Last chance. Activating writes the trading lockout lock file
                and prevents new orders until manually cleared.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={submitting}
                onClick={(e) => {
                  e.preventDefault();
                  setStep(1);
                }}
              >
                Back
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting}
                onClick={(e) => {
                  e.preventDefault();
                  void onActivate();
                }}
                className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
              >
                {submitting ? "Activating..." : "Activate kill switch"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Persistent banner displayed when the UTP kill switch lock is active.
 * Polls /api/kill-switch/status every 10s.
 */
export function KillSwitchBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_UTP_BASE_URL ?? "http://localhost:8000"}/api/kill-switch/status`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          if (!cancelled) setActive(false);
          return;
        }
        const data = (await res.json()) as { lock_active?: boolean };
        if (!cancelled) setActive(Boolean(data.lock_active));
      } catch {
        // Silent: status endpoint may be down, treat as not-active for banner.
        if (!cancelled) setActive(false);
      }
    }
    void poll();
    const id = window.setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!active) return null;
  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-red-500/40 bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow"
    >
      <span aria-hidden="true">!!</span>
      <span>KILL SWITCH ACTIVE -- trading halted</span>
      <span aria-hidden="true">!!</span>
    </div>
  );
}
