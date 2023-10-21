import colors from "colors";
import _sortBy from "lodash/sortBy";

import { DiffCell, DiffProgram } from "../types";

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
  diffs: DiffProgram[],
  minCircuitChangePercentage: number
): DiffProgram[] =>
  diffs.filter(
    (method) =>
      Math.abs(method.circuit_size.percentage) >= minCircuitChangePercentage &&
      (method.acir_opcodes.delta !== 0 || method.circuit_size.delta !== 0)
  );

export const formatShellDiff = (diffs: DiffProgram[], summaryQuantile = 0.8) => {
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

  const sortedPrograms = _sortBy(diffs, (method) => Math.abs(method.circuit_size.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedPrograms[Math.floor((sortedPrograms.length - 1) * summaryQuantile)]?.circuit_size
      .percentage ?? 0
  );

  const summaryRows = selectSummaryDiffs(diffs, circuitChangeQuantile).map((diff) =>
    [
      "",
      colors.bold(colors.grey(diff.name.padEnd(maxProgramLength))),
      ...formatShellCell(diff.acir_opcodes),
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
      ...formatShellCell(diff.acir_opcodes),
      ...formatShellCell(diff.circuit_size),
      "",
    ]
      .join(" | ")
      .trim()
  );

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

const MARKDOWN_SUMMARY_COLS = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "ACIR opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "Circuit size (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

const MARKDOWN_DIFF_COLS = [
  { txt: "" },
  { txt: "Program", align: TextAlign.LEFT },
  { txt: "ACIR opcodes (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "Circuit size (+/-)", align: TextAlign.RIGHT },
  { txt: "%", align: TextAlign.RIGHT },
  { txt: "" },
];

export const formatMarkdownDiff = (
  header: string,
  diffs: DiffProgram[],
  repository: string,
  commitHash: string,
  refCommitHash?: string,
  summaryQuantile = 0.8
) => {
  const diffReport = [header, "", generateCommitInfo(repository, commitHash, refCommitHash)];
  if (diffs.length === 0)
    return diffReport.concat(["", "### There are no changes in circuit sizes"]).join("\n").trim();

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

  const sortedMethods = _sortBy(diffs, (program) => Math.abs(program.circuit_size.percentage));
  const circuitChangeQuantile = Math.abs(
    sortedMethods[Math.floor((sortedMethods.length - 1) * summaryQuantile)]?.circuit_size
      .percentage ?? 0
  );

  const summaryRows = selectSummaryDiffs(diffs, circuitChangeQuantile).flatMap((diff) =>
    [
      "",
      `**${diff.name}**`,
      ...formatMarkdownSummaryCell([diff.acir_opcodes]),
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
      ...formatMarkdownFullCell([diff.acir_opcodes]),
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
