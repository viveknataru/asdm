import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { seedState } from "./seed";
import type {
  CaseResult,
  LabState,
  LogEntry,
  Screenshot,
  Settings,
  StepResult,
  TestRun,
} from "./types";

const STORAGE_KEY = "asdm-automation-lab:v1";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

/* ---------- synthetic history so the dashboard has signal on first load ---------- */
function buildHistory(base: LabState): TestRun[] {
  const runs: TestRun[] = [];
  const ids = ["TC-001", "TC-002", "TC-010"];
  for (let i = 8; i >= 1; i--) {
    const startedAt = new Date(Date.now() - i * 1000 * 60 * 97).toISOString();
    const failIdx = i === 3 || i === 6 ? 1 : -1;
    const cases: CaseResult[] = ids.map((caseId, idx) => {
      const tc = base.testCases.find((c) => c.id === caseId)!;
      const failed = idx === failIdx;
      return {
        caseId,
        status: failed ? "failed" : "passed",
        startedAt,
        finishedAt: startedAt,
        steps: tc.steps.map((s, si) => ({
          stepId: s.id,
          status: failed && si === tc.steps.length - 2 ? "failed" : failed && si === tc.steps.length - 1 ? "skipped" : "passed",
          durationMs: 220 + ((si * 137 + i * 53) % 900),
          message: failed && si === tc.steps.length - 2 ? "Assertion failed: expected element not found within timeout" : undefined,
        })),
      };
    });
    runs.push({
      id: `run-h${i}`,
      name: "Smoke",
      suiteId: "suite-smoke",
      envId: "env-mock",
      startedAt,
      finishedAt: new Date(new Date(startedAt).getTime() + 42_000).toISOString(),
      status: failIdx >= 0 ? "failed" : "passed",
      cases,
    });
  }
  return runs.reverse();
}

function initialState(): LabState {
  const base = seedState();
  return { ...base, runs: buildHistory(base) };
}

/* -------------------------------- context -------------------------------- */
interface LabContextValue extends LabState {
  activeRunId: string | null;
  startRun: (opts: { caseIds: string[]; name: string; suiteId?: string | undefined }) => string | null;
  cancelRun: () => void;
  rerunFailed: (runId: string) => string | null;
  testConnection: (envId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  clearLogs: () => void;
  resetDemoData: () => void;
}

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LabState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LabState;
        parsed.runs = parsed.runs.map((r) =>
          r.status === "running" ? { ...r, status: "cancelled" as const } : r,
        );
        setState(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const log = useCallback(
    (level: LogEntry["level"], source: string, message: string, runId?: string) => {
      setState((s) => ({
        ...s,
        logs: [
          { id: uid("log"), ts: now(), level, source, message, runId },
          ...s.logs,
        ].slice(0, 500),
      }));
    },
    [],
  );

  const patchRun = useCallback((runId: string, fn: (r: TestRun) => TestRun) => {
    setState((s) => ({ ...s, runs: s.runs.map((r) => (r.id === runId ? fn(r) : r)) }));
  }, []);

  /* ------------------------------ run engine ------------------------------ */
  const execute = useCallback(
    (runId: string, caseIds: string[], settings: Settings, cases: { id: string; steps: string[]; titles: string[] }[]) => {
      let ci = 0;
      let si = 0;

      const chosenFailCase =
        settings.failureInjection
          ? settings.failCaseId === "random"
            ? caseIds[Math.floor(Math.random() * caseIds.length)]
            : settings.failCaseId
          : null;

      const tick = () => {
        if (cancelled.current) return;
        const current = cases[ci];
        if (!current) {
          patchRun(runId, (r) => ({
            ...r,
            finishedAt: now(),
            status: r.cases.some((c) => c.status === "failed") ? "failed" : "passed",
          }));
          log("info", "runner", `Run ${runId} finished`, runId);
          setActiveRunId(null);
          return;
        }
        const stepId = current.steps[si];
        if (!stepId) {
          patchRun(runId, (r) => ({
            ...r,
            cases: r.cases.map((c) =>
              c.caseId === current.id
                ? {
                    ...c,
                    finishedAt: now(),
                    status: c.steps.some((s) => s.status === "failed") ? "failed" : "passed",
                  }
                : c,
            ),
          }));
          ci += 1;
          si = 0;
          timer.current = setTimeout(tick, settings.stepDelayMs);
          return;
        }

        const failHere =
          chosenFailCase === current.id &&
          si === Math.max(0, current.steps.length - 2) &&
          Math.random() < Math.max(settings.failureRate, 0.01) + 0.55;

        const duration = 180 + Math.floor(Math.random() * 700);
        const shotId = uid("shot");

        setState((s) => {
          const screenshots: Screenshot[] = settings.captureScreenshots
            ? [
                {
                  id: shotId,
                  runId,
                  caseId: current.id,
                  stepId,
                  label: current.titles[si] ?? stepId,
                  screen: current.id,
                  ts: now(),
                  failed: failHere,
                },
                ...s.screenshots,
              ].slice(0, 120)
            : s.screenshots;

          return {
            ...s,
            screenshots,
            logs: [
              {
                id: uid("log"),
                ts: now(),
                level: failHere ? ("error" as const) : ("info" as const),
                source: `${current.id}`,
                message: failHere
                  ? `FAIL · ${current.titles[si]} — element not found within 10000ms`
                  : `PASS · ${current.titles[si]} (${duration}ms)`,
                runId,
              },
              ...s.logs,
            ].slice(0, 500),
            runs: s.runs.map((r) =>
              r.id !== runId
                ? r
                : {
                    ...r,
                    cases: r.cases.map((c) => {
                      if (c.caseId !== current.id) return c;
                      const steps: StepResult[] = c.steps.map((st) => {
                        if (st.stepId !== stepId) return st;
                        return {
                          ...st,
                          status: failHere ? "failed" : "passed",
                          durationMs: duration,
                          screenshotId: settings.captureScreenshots ? shotId : undefined,
                          message: failHere
                            ? "AssertionError: expected widget to be present (timeout 10000ms)"
                            : undefined,
                        };
                      });
                      if (failHere) {
                        return {
                          ...c,
                          status: "failed" as const,
                          steps: steps.map((st, idx) =>
                            idx > si && st.status === "pending" ? { ...st, status: "skipped" as const } : st,
                          ),
                        };
                      }
                      const nextId = current.steps[si + 1];
                      return {
                        ...c,
                        status: "running" as const,
                        steps: steps.map((st) =>
                          st.stepId === nextId ? { ...st, status: "running" as const } : st,
                        ),
                      };
                    }),
                  },
            ),
          };
        });

        if (failHere) {
          ci += 1;
          si = 0;
        } else {
          si += 1;
        }
        timer.current = setTimeout(tick, settings.stepDelayMs);
      };

      timer.current = setTimeout(tick, settings.stepDelayMs);
    },
    [log, patchRun],
  );

  const startRun = useCallback(
    (opts: { caseIds: string[]; name: string; suiteId?: string | undefined }) => {
      if (activeRunId) return null;
      const caseIds = opts.caseIds.filter(Boolean);
      if (!caseIds.length) return null;
      const runId = uid("run");
      const settings = state.settings;
      const env = state.environments.find((e) => e.connected) ?? state.environments[0];
      if (!env) return null;

      const cases = caseIds.map((id) => {
        const tc = state.testCases.find((c) => c.id === id)!;
        return { id, steps: tc.steps.map((s) => s.id), titles: tc.steps.map((s) => `${s.action} ${s.target}`) };
      });

      const run: TestRun = {
        id: runId,
        name: opts.name,
        suiteId: opts.suiteId,
        envId: env.id,
        startedAt: now(),
        status: "running",
        cases: caseIds.map((id, idx) => {
          const tc = state.testCases.find((c) => c.id === id)!;
          return {
            caseId: id,
            status: idx === 0 ? ("running" as const) : ("pending" as const),
            startedAt: now(),
            steps: tc.steps.map((s, si) => ({
              stepId: s.id,
              status: idx === 0 && si === 0 ? ("running" as const) : ("pending" as const),
            })),
          };
        }),
      };

      cancelled.current = false;
      setState((s) => ({
        ...s,
        runs: [...s.runs, run],
        logs: [
          {
            id: uid("log"),
            ts: now(),
            level: "info" as const,
            source: "runner",
            message: `Starting "${opts.name}" · ${caseIds.length} case(s) on ${env.name}`,
            runId,
          },
          ...s.logs,
        ].slice(0, 500),
      }));
      setActiveRunId(runId);
      execute(runId, caseIds, settings, cases);
      return runId;
    },
    [activeRunId, execute, state.environments, state.settings, state.testCases],
  );

  const cancelRun = useCallback(() => {
    if (!activeRunId) return;
    cancelled.current = true;
    if (timer.current) clearTimeout(timer.current);
    patchRun(activeRunId, (r) => ({
      ...r,
      status: "cancelled",
      finishedAt: now(),
      cases: r.cases.map((c) => ({
        ...c,
        status: c.status === "running" || c.status === "pending" ? "skipped" : c.status,
        steps: c.steps.map((s) =>
          s.status === "running" || s.status === "pending" ? { ...s, status: "skipped" as const } : s,
        ),
      })),
    }));
    log("warn", "runner", "Run cancelled by operator", activeRunId);
    setActiveRunId(null);
  }, [activeRunId, log, patchRun]);

  const rerunFailed = useCallback(
    (runId: string) => {
      const run = state.runs.find((r) => r.id === runId);
      if (!run) return null;
      const failed = run.cases.filter((c) => c.status === "failed").map((c) => c.caseId);
      if (!failed.length) return null;
      return startRun({ caseIds: failed, name: `${run.name} · rerun failed`, suiteId: run.suiteId });
    },
    [startRun, state.runs],
  );

  const testConnection = useCallback(
    (envId: string) => {
      setState((s) => ({
        ...s,
        environments: s.environments.map((e) =>
          e.id !== envId
            ? e
            : {
                ...e,
                connected: e.mock,
                lastChecked: now(),
                latencyMs: e.mock ? 18 + Math.floor(Math.random() * 30) : undefined,
              },
        ),
        logs: [
          {
            id: uid("log"),
            ts: now(),
            level: s.environments.find((e) => e.id === envId)?.mock ? ("info" as const) : ("error" as const),
            source: "connection",
            message: s.environments.find((e) => e.id === envId)?.mock
              ? "Handshake OK — mock ASDM driver responded"
              : "No desktop driver available — real ASDM automation is not implemented yet",
          },
          ...s.logs,
        ].slice(0, 500),
      }));
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const clearLogs = useCallback(() => setState((s) => ({ ...s, logs: [] })), []);

  const resetDemoData = useCallback(() => {
    cancelled.current = true;
    if (timer.current) clearTimeout(timer.current);
    setActiveRunId(null);
    setState(initialState());
  }, []);

  const value = useMemo<LabContextValue>(
    () => ({
      ...state,
      activeRunId,
      startRun,
      cancelRun,
      rerunFailed,
      testConnection,
      updateSettings,
      clearLogs,
      resetDemoData,
    }),
    [state, activeRunId, startRun, cancelRun, rerunFailed, testConnection, updateSettings, clearLogs, resetDemoData],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab must be used inside LabProvider");
  return ctx;
}

/* ------------------------------ derived utils ------------------------------ */
export function runDuration(run: { startedAt: string; finishedAt?: string }) {
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, end - new Date(run.startedAt).getTime());
}

export function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function runStats(run: TestRun) {
  const passed = run.cases.filter((c) => c.status === "passed").length;
  const failed = run.cases.filter((c) => c.status === "failed").length;
  const skipped = run.cases.filter((c) => c.status === "skipped" || c.status === "pending").length;
  return { passed, failed, skipped, total: run.cases.length };
}