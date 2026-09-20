export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";
export type RunStatus = "running" | "passed" | "failed" | "cancelled";
export type CaseStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface TestStep {
  id: string;
  action: string;
  target: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  module: string;
  priority: "P0" | "P1" | "P2";
  implemented: boolean;
  description: string;
  tags: string[];
  steps: TestStep[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  caseIds: string[];
}

export interface Environment {
  id: string;
  name: string;
  host: string;
  version: string;
  driver: string;
  connected: boolean;
  lastChecked?: string | undefined;
  latencyMs?: number | undefined;
  mock: boolean;
}

export interface StepResult {
  stepId: string;
  status: StepStatus;
  durationMs?: number | undefined;
  message?: string | undefined;
  screenshotId?: string | undefined;
}

export interface CaseResult {
  caseId: string;
  status: CaseStatus;
  steps: StepResult[];
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
}

export interface TestRun {
  id: string;
  name: string;
  suiteId?: string | undefined;
  envId: string;
  startedAt: string;
  finishedAt?: string | undefined;
  status: RunStatus;
  cases: CaseResult[];
}

export interface LogEntry {
  id: string;
  ts: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  runId?: string | undefined;
}

export interface Screenshot {
  id: string;
  runId: string;
  caseId: string;
  stepId: string;
  label: string;
  screen: string;
  ts: string;
  failed: boolean;
}

export interface Settings {
  demoMode: boolean;
  stepDelayMs: number;
  failureInjection: boolean;
  failureRate: number;
  failCaseId: string | "random";
  captureScreenshots: boolean;
}

export interface LabState {
  environments: Environment[];
  testCases: TestCase[];
  suites: TestSuite[];
  runs: TestRun[];
  logs: LogEntry[];
  screenshots: Screenshot[];
  settings: Settings;
}