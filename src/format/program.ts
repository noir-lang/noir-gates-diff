import colors from "colors";
import _sortBy from "lodash/sortBy";

import { DiffBrillig, DiffCell, DiffCircuit } from "../types";

import {
  alignPattern,
  center,
  generateCommitInfo,
  parenthesized,
  plusSign,
  TextAlign,
} from "./utils";

export const formatShellCell = (cell: DiffCell, length = 10) => {
  const format = colors[cell.delta > 0 ? "red" : cell.delta < 0 ? "green" : "reset"];

  return [
    cell.current.toLocaleString().padStart(length) +
      " " +
      format(parenthesized(plusSign(cell.delta) + cell.delta.toLocaleString()).padEnd(length)),
    colors.bold(
      format(
        (
          plusSign(cell.percentage) +
          (cell.percentage === Infinity ? "∞" : cell.percentage.toFixed(2)) +
          "%"
        ).padStart(9)
      )
    ),
  ];
};

const selectSummaryDiffs = (
  diffs: DiffCircuit[],
  minCircuitChangePercentage: number
): DiffCircuit[] =>
  diffs.filter(
    (method) =>
      Math.abs(method.circuit_size.percentage) >= minCircuitChangePercentage &&
      (method.opcodes.delta !== 0 || method.circuit_size.delta !== 0)
  );

const selectSummaryDiffsBrillig = (
  diffs: DiffBrillig[],
  minCircuitChangePercentage: number
): DiffBrillig[] =>
  diffs.filter(
    (method) =>
      Math.abs(method.opcodes.percentage) >= minCircuitChangePercentage &&
      method.opcodes.delta !== 0
  );

export const formatShellCircuitRows = (
  diffs: DiffCircuit[],
  summaryQuantile = 0.8
): [string[], string[]] => {
  const maxProgramLength = Math.max(8, ...diffs.map(({ name }) => name.length));

  const sortedPrograms = _sortBy(diffs, (method) => Math.abs(method.circuit_size.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedPrograms[Math.floor((sortedPrograms.length - 1) * summaryQuantile)]?.circuit_size
      .percentage ?? 0
  );

  const summaryRows = selectSummaryDiffs(diffs, circuitChangeQuantile).map((diff) =>
    [
      "",
      colors.bold(colors.grey(diff.name.padEnd(maxProgramLength))),
      ...formatShellCell(diff.opcodes),
      ...formatShellCell(diff.circuit_size),
      "",
    ]
      .join(" | ")
      .trim()
  );

  const fullReportRows = diffs.map((diff) =>
    [
      "",
      colors.bold(colors.grey(diff.name.padEnd(maxProgramLength))),
      ...formatShellCell(diff.opcodes),
      ...formatShellCell(diff.circuit_size),
      "",
    ]
      .join(" | ")
      .trim()
  );

  return [summaryRows, fullReportRows];
};

export const formatShellDiff = (
  diffs: DiffCircuit[],
  summaryRows: string[],
  fullReportRows: string[],
  summaryQuantile = 0.8
) => {
  const maxProgramLength = Math.max(8, ...diffs.map(({ name }) => name.length));

  const SHELL_SUMMARY_COLS = [
    { txt: "", length: 0 },
    { txt: "Program", length: maxProgramLength },
    { txt: "ACIR opcodes (+/-)", length: 33 },
    { txt: "Circuit size (+/-)", length: 33 },
    { txt: "", length: 0 },
  ];

  const SHELL_DIFF_COLS = [
    { txt: "", length: 0 },
    { txt: "Program", length: maxProgramLength },
    { txt: "ACIR opcodes (+/-)", length: 33 },
    { txt: "Circuit size (+/-)", length: 33 },
    { txt: "", length: 0 },
  ];

  const summaryHeader = SHELL_SUMMARY_COLS.map((entry) =>
    colors.bold(center(entry.txt, entry.length || 0))
  )
    .join(" | ")
    .trim();
  const summarySeparator = SHELL_SUMMARY_COLS.map(({ length }) =>
    length > 0 ? "-".repeat(length + 2) : ""
  )
    .join("|")
    .trim();

  const diffHeader = SHELL_DIFF_COLS.map((entry) =>
    colors.bold(center(entry.txt, entry.length || 0))
  )
    .join(" | ")
    .trim();
  const diffSeparator = SHELL_DIFF_COLS.map(({ length }) =>
    length > 0 ? "-".repeat(length + 2) : ""
  )
    .join("|")
    .trim();

  return (
    colors.underline(
      colors.bold(
        colors.yellow(
          `🧾 Summary (${Math.round((1 - summaryQuantile) * 100)}% most significant diffs)\n\n`
        )
      )
    ) +
    ["", summaryHeader, ...summaryRows, ""].join(`\n${summarySeparator}\n`).trim() +
    colors.underline(colors.bold(colors.yellow("\n\nFull diff report 👇\n\n"))) +
    ["", diffHeader, ...fullReportRows, ""].join(`\n${diffSeparator}\n`).trim()
  );
};

export const formatShellBrilligRows = (
  diffs: DiffBrillig[],
  summaryQuantile = 0.8
): [string[], string[]] => {
  const maxProgramLength = Math.max(8, ...diffs.map(({ name }) => name.length));

  const sortedPrograms = _sortBy(diffs, (method) => Math.abs(method.opcodes.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedPrograms[Math.floor((sortedPrograms.length - 1) * summaryQuantile)]?.opcodes.percentage ??
      0
  );

  const summaryRows = selectSummaryDiffsBrillig(diffs, circuitChangeQuantile).map((diff) =>
    [
      "",
      colors.bold(colors.grey(diff.name.padEnd(maxProgramLength))),
      ...formatShellCell(diff.opcodes),
      "",
    ]
      .join(" | ")
      .trim()
  );

  const fullReportRows = diffs.map((diff) =>
    [
      "",
      colors.bold(colors.grey(diff.name.padEnd(maxProgramLength))),
      ...formatShellCell(diff.opcodes),
      "",
    ]
      .join(" | ")
      .trim()
  );

  return [summaryRows, fullReportRows];
};

export const formatShellDiffBrillig = (
  diffs: DiffBrillig[],
  summaryRows: string[],
  fullReportRows: string[],
  summaryQuantile = 0.8
) => {
  const maxProgramLength = Math.max(8, ...diffs.map(({ name }) => name.length));

  const SHELL_SUMMARY_COLS = [
    { txt: "", length: 0 },
    { txt: "Program", length: maxProgramLength },
    { txt: "ACIR opcodes (+/-)", length: 33 },
    { txt: "", length: 0 },
  ];

  const SHELL_DIFF_COLS = [
    { txt: "", length: 0 },
    { txt: "Program", length: maxProgramLength },
    { txt: "ACIR opcodes (+/-)", length: 33 },
    { txt: "", length: 0 },
  ];

  const summaryHeader = SHELL_SUMMARY_COLS.map((entry) =>
    colors.bold(center(entry.txt, entry.length || 0))
  )
    .join(" | ")
    .trim();
  const summarySeparator = SHELL_SUMMARY_COLS.map(({ length }) =>
    length > 0 ? "-".repeat(length + 2) : ""
  )
    .join("|")
    .trim();

  const diffHeader = SHELL_DIFF_COLS.map((entry) =>
    colors.bold(center(entry.txt, entry.length || 0))
  )
    .join(" | ")
    .trim();
  const diffSeparator = SHELL_DIFF_COLS.map(({ length }) =>
    length > 0 ? "-".repeat(length + 2) : ""
  )
    .join("|")
    .trim();

  return (
    colors.underline(
      colors.bold(
        colors.yellow(
          `🧾 Summary (${Math.round((1 - summaryQuantile) * 100)}% most significant diffs)\n\n`
        )
      )
    ) +
    ["", summaryHeader, ...summaryRows, ""].join(`\n${summarySeparator}\n`).trim() +
    colors.underline(colors.bold(colors.yellow("\n\nFull diff report 👇\n\n"))) +
    ["", diffHeader, ...fullReportRows, ""].join(`\n${diffSeparator}\n`).trim()
  );
};

const formatMarkdownSummaryCell = (rows: DiffCell[]) => [
  rows
    .map(
      (row) =>
        plusSign(row.delta) +
        row.delta.toLocaleString() +
        " " +
        (row.delta > 0 ? "❌" : row.delta < 0 ? "✅" : "➖")
    )
    .join("<br />"),
  rows
    .map(
      (row) =>
        "**" +
        plusSign(row.percentage) +
        (row.percentage === Infinity ? "∞" : row.percentage.toFixed(2)) +
        "%**"
    )
    .join("<br />"),
];

const formatMarkdownFullCell = (rows: DiffCell[]): string[] => [
  rows
    .map(
      (row) =>
        row.current.toLocaleString() +
        "&nbsp;(" +
        plusSign(row.delta) +
        row.delta.toLocaleString() +
        ")"
    )
    .join("<br />"),
  rows
    .map(
      (row) =>
        "**" +
        plusSign(row.percentage) +
        (row.percentage === Infinity ? "∞" : row.percentage.toFixed(2)) +
        "%**"
    )
    .join("<br />"),
];

const MARKDOWN_SUMMARY_COLS_CIRCUIT = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "ACIR opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "Circuit size (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

const MARKDOWN_DIFF_COLS_CIRCUIT = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "ACIR opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "Circuit size (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

const MARKDOWN_SUMMARY_COLS_BRILLIG = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "Brillig opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

const MARKDOWN_DIFF_COLS_BRILLIG = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "Brillig opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

export const formatMarkdownDiff = (
  header: string,
  diffs: DiffCircuit[],
  repository: string,
  commitHash: string,
  refCommitHash?: string,
  summaryQuantile = 0.8
) => {
  const diffReport = [header, "", generateCommitInfo(repository, commitHash, refCommitHash)];
  if (diffs.length === 0)
    return diffReport.concat(["", "### There are no changes in circuit sizes"]).join("\n").trim();

  const summaryHeader = MARKDOWN_SUMMARY_COLS_CIRCUIT.map((entry) => entry.txt)
    .join(" | ")
    .trim();
  const summaryHeaderSeparator = MARKDOWN_SUMMARY_COLS_CIRCUIT.map((entry) =>
    entry.txt ? alignPattern(entry.align) : ""
  )
    .join("|")
    .trim();

  const diffHeader = MARKDOWN_DIFF_COLS_CIRCUIT.map((entry) => entry.txt)
    .join(" | ")
    .trim();
  const diffHeaderSeparator = MARKDOWN_DIFF_COLS_CIRCUIT.map((entry) =>
    entry.txt ? alignPattern(entry.align) : ""
  )
    .join("|")
    .trim();

  const sortedMethods = _sortBy(diffs, (program) => Math.abs(program.circuit_size.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedMethods[Math.floor((sortedMethods.length - 1) * summaryQuantile)]?.circuit_size
      .percentage ?? 0
  );

  const summaryRows = selectSummaryDiffs(diffs, circuitChangeQuantile).flatMap((diff) =>
    [
      "",
      `**${diff.name}**`,
      ...formatMarkdownSummaryCell([diff.opcodes]),
      ...formatMarkdownSummaryCell([diff.circuit_size]),
      "",
    ]
      .join(" | ")
      .trim()
  );

  const fullReportRows = diffs.flatMap((diff) =>
    [
      "",
      `**${diff.name}**`,
      ...formatMarkdownFullCell([diff.opcodes]),
      ...formatMarkdownFullCell([diff.circuit_size]),
      "",
    ]
      .join(" | ")
      .trim()
  );

  return diffReport
    .concat([
      "",
      `### 🧾 Summary (${Math.round((1 - summaryQuantile) * 100)}% most significant diffs)`,
      "",
      summaryHeader,
      summaryHeaderSeparator,
      ...summaryRows,
      "---",
      "",
      "<details>",
      "<summary><strong>Full diff report</strong> 👇</summary>",
      "<br />",
      "",
      diffHeader,
      diffHeaderSeparator,
      ...fullReportRows,
      "</details>",
      "",
    ])
    .join("\n")
    .trim();
};

export const formatCircuitRows = (
  diffs: DiffCircuit[],
  summaryQuantile = 0.8
): [string[], string[]] => {
  const sortedMethods = _sortBy(diffs, (program) => Math.abs(program.circuit_size.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedMethods[Math.floor((sortedMethods.length - 1) * summaryQuantile)]?.circuit_size
      .percentage ?? 0
  );

  const summaryRows = selectSummaryDiffs(diffs, circuitChangeQuantile).flatMap((diff) =>
    [
      "",
      `**${diff.name}**`,
      ...formatMarkdownSummaryCell([diff.opcodes]),
      ...formatMarkdownSummaryCell([diff.circuit_size]),
      "",
    ]
      .join(" | ")
      .trim()
  );

  const fullReportRows = diffs.flatMap((diff) =>
    [
      "",
      `**${diff.name}**`,
      ...formatMarkdownFullCell([diff.opcodes]),
      ...formatMarkdownFullCell([diff.circuit_size]),
      "",
    ]
      .join(" | ")
      .trim()
  );

  return [summaryRows, fullReportRows];
};

export const formatBrilligRows = (
  diffs: DiffBrillig[],
  summaryQuantile = 0.8
): [string[], string[]] => {
  const sortedMethods = _sortBy(diffs, (program) => Math.abs(program.opcodes.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedMethods[Math.floor((sortedMethods.length - 1) * summaryQuantile)]?.opcodes.percentage ?? 0
  );

  const summaryRows = selectSummaryDiffsBrillig(diffs, circuitChangeQuantile).flatMap((diff) =>
    ["", `**${diff.name}**`, ...formatMarkdownSummaryCell([diff.opcodes]), ""].join(" | ").trim()
  );

  const fullReportRows = diffs.flatMap((diff) =>
    ["", `**${diff.name}**`, ...formatMarkdownFullCell([diff.opcodes]), ""].join(" | ").trim()
  );

  return [summaryRows, fullReportRows];
};

export const formatMarkdownDiffNew = (
  header: string,
  repository: string,
  commitHash: string,
  summaryRows: string[],
  fullReportRows: string[],
  // Flag to distinguish the markdown columns that should be used
  circuitReport: boolean,
  refCommitHash?: string,
  summaryQuantile = 0.8
) => {
  const diffReport = [header, "", generateCommitInfo(repository, commitHash, refCommitHash)];
  if (fullReportRows.length === 0)
    return diffReport.concat(["", "### There are no changes in circuit sizes"]).join("\n").trim();

  let MARKDOWN_SUMMARY_COLS;
  let MARKDOWN_DIFF_COLS;
  if (circuitReport) {
    MARKDOWN_SUMMARY_COLS = MARKDOWN_SUMMARY_COLS_CIRCUIT;
    MARKDOWN_DIFF_COLS = MARKDOWN_DIFF_COLS_CIRCUIT;
  } else {
    MARKDOWN_SUMMARY_COLS = MARKDOWN_SUMMARY_COLS_BRILLIG;
    MARKDOWN_DIFF_COLS = MARKDOWN_DIFF_COLS_BRILLIG;
  }

  const summaryHeader = MARKDOWN_SUMMARY_COLS.map((entry) => entry.txt)
    .join(" | ")
    .trim();
  const summaryHeaderSeparator = MARKDOWN_SUMMARY_COLS.map((entry) =>
    entry.txt ? alignPattern(entry.align) : ""
  )
    .join("|")
    .trim();

  const diffHeader = MARKDOWN_DIFF_COLS.map((entry) => entry.txt)
    .join(" | ")
    .trim();
  const diffHeaderSeparator = MARKDOWN_DIFF_COLS.map((entry) =>
    entry.txt ? alignPattern(entry.align) : ""
  )
    .join("|")
    .trim();

  return diffReport
    .concat([
      "",
      `### 🧾 Summary (${Math.round((1 - summaryQuantile) * 100)}% most significant diffs)`,
      "",
      summaryHeader,
      summaryHeaderSeparator,
      ...summaryRows,
      "---",
      "",
      "<details>",
      "<summary><strong>Full diff report</strong> 👇</summary>",
      "<br />",
      "",
      diffHeader,
      diffHeaderSeparator,
      ...fullReportRows,
      "</details>",
      "",
    ])
    .join("\n")
    .trim();
};
