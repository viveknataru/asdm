import type { LabState, TestCase } from "./types";

const step = (id: string, action: string, target: string, expected: string) => ({
  id,
  action,
  target,
  expected,
});

const placeholder = (
  id: string,
  title: string,
  module: string,
  description: string,
): TestCase => ({
  id,
  title,
  module,
  priority: "P2",
  implemented: false,
  description,
  tags: ["planned", module.toLowerCase()],
  steps: [
    step(`${id}-s1`, "Navigate", `${module} panel`, `${module} panel is rendered`),
    step(`${id}-s2`, "Verify", "Panel controls", "Controls are enabled and readable"),
  ],
});

export const seedTestCases: TestCase[] = [
  {
    id: "TC-001",
    title: "Login to ASDM",
    module: "Authentication",
    priority: "P0",
    implemented: true,
    description:
      "Validates that an operator can authenticate into the ASDM console and land on the device home view.",
    tags: ["smoke", "auth", "critical-path"],
    steps: [
      step("TC-001-s1", "Launch", "ASDM client (mock driver)", "Launcher window is visible"),
      step("TC-001-s2", "Type", "Device IP field = 10.10.20.1", "Field accepts the address"),
      step("TC-001-s3", "Type", "Username field = admin", "Username is masked-safe and accepted"),
      step("TC-001-s4", "Type", "Password field = ********", "Password field shows masked input"),
      step("TC-001-s5", "Click", "OK button", "Authentication request is submitted"),
      step("TC-001-s6", "Wait", "Main window title 'Cisco ASDM 7.x'", "Main window loads < 15s"),
      step("TC-001-s7", "Assert", "Session banner shows admin/15", "Privilege level 15 confirmed"),
    ],
  },
  {
    id: "TC-002",
    title: "Dashboard widgets load",
    module: "Home",
    priority: "P0",
    implemented: true,
    description:
      "Verifies that the ASDM Home > Device Dashboard renders device info, interface status and traffic widgets.",
    tags: ["smoke", "dashboard"],
    steps: [
      step("TC-002-s1", "Click", "Home toolbar button", "Home view is selected"),
      step("TC-002-s2", "Select", "Device Dashboard tab", "Dashboard tab active"),
      step("TC-002-s3", "Assert", "Device Information panel", "Hostname, version, uptime present"),
      step("TC-002-s4", "Assert", "Interface Status table", "At least 2 interfaces listed as up"),
      step("TC-002-s5", "Assert", "Traffic Status graphs", "Both graphs render data points"),
      step("TC-002-s6", "Capture", "Full dashboard", "Screenshot archived to run artifacts"),
    ],
  },
  {
    id: "TC-010",
    title: "Logout and session teardown",
    module: "Authentication",
    priority: "P0",
    implemented: true,
    description:
      "Ensures a clean logout, session invalidation and return to the ASDM login prompt.",
    tags: ["smoke", "auth"],
    steps: [
      step("TC-010-s1", "Click", "File menu", "Menu expands"),
      step("TC-010-s2", "Click", "Exit / Logout item", "Confirmation dialog appears"),
      step("TC-010-s3", "Click", "Yes button", "Session teardown begins"),
      step("TC-010-s4", "Assert", "Login prompt visible", "Credentials are cleared"),
      step("TC-010-s5", "Assert", "Session token invalidated", "Re-entry requires credentials"),
    ],
  },
  placeholder(
    "TC-003",
    "Interfaces configuration grid",
    "Interfaces",
    "Planned coverage for Configuration > Device Setup > Interfaces grid validation.",
  ),
  placeholder(
    "TC-004",
    "NAT rules table",
    "NAT",
    "Planned coverage for Configuration > Firewall > NAT Rules listing and rule add dialog.",
  ),
  placeholder(
    "TC-005",
    "ACL rule editor",
    "ACL",
    "Planned coverage for Access Rules editor, rule ordering and hit counters.",
  ),
  placeholder(
    "TC-006",
    "Site-to-site VPN wizard",
    "VPN",
    "Planned coverage for the IPsec site-to-site wizard happy path.",
  ),
  placeholder(
    "TC-007",
    "Monitoring graphs",
    "Monitoring",
    "Planned coverage for Monitoring > Interfaces throughput graphs and connection counters.",
  ),
];

export const seedState = (): LabState => ({
  environments: [
    {
      id: "env-mock",
      name: "Mock ASDM",
      host: "mock://asdm-lab.local",
      version: "ASDM 7.20(1) · ASA 9.18(2)",
      driver: "MockDriver v0.4 (in-browser simulation)",
      connected: true,
      mock: true,
      lastChecked: new Date().toISOString(),
      latencyMs: 24,
    },
    {
      id: "env-lab",
      name: "Lab ASA (physical)",
      host: "10.10.20.1",
      version: "unknown",
      driver: "DesktopDriver (future interface — not implemented)",
      connected: false,
      mock: false,
    },
  ],
  testCases: seedTestCases,
  suites: [
    {
      id: "suite-smoke",
      name: "Smoke",
      description: "Fast critical-path check executed on every build.",
      caseIds: ["TC-001", "TC-002", "TC-010"],
    },
    {
      id: "suite-regression",
      name: "Regression",
      description: "Full functional sweep including planned placeholder modules.",
      caseIds: ["TC-001", "TC-002", "TC-003", "TC-004", "TC-005", "TC-006", "TC-007", "TC-010"],
    },
  ],
  runs: [],
  logs: [],
  screenshots: [],
  settings: {
    demoMode: true,
    stepDelayMs: 450,
    failureInjection: false,
    failureRate: 0.25,
    failCaseId: "random",
    captureScreenshots: true,
  },
});