import * as fs from "fs";

import { formatCircuitRows, formatMarkdownDiff } from "../src/format/program";
import { computeProgramDiffs, parseReport } from "../src/report";
import { DiffBrillig, DiffCircuit } from "../src/types";

const brilligReport = fs.readFileSync("tests/mocks/brillig_report.json", "utf8");
const referenceRealWorldContent = fs.readFileSync(
  "tests/mocks/full_gas_report_before.json",
  "utf8"
);
const compareRealWorldContent = fs.readFileSync("tests/mocks/full_gas_report_after.json", "utf8");

describe("Report Loading", () => {
  it("should load a real-world report successfully", () => {
    const report = parseReport(brilligReport);
    console.log(report);
  });

  it("should load a real-world brillig report successfully", () => {
    const report = parseReport(referenceRealWorldContent);
    console.log(report);
  });
});

describe("Program diffs", () => {
  it("should return zero diff against itself", () => {
    const report = parseReport(referenceRealWorldContent);
    expect(computeProgramDiffs(report.programs, report.programs)).toStrictEqual([[], []]);
  });

  it("should return expected diff against reference report", () => {
    const referenceReport = parseReport(referenceRealWorldContent);
    const compareReport = parseReport(compareRealWorldContent);
    const expectedCircuitDiffs: DiffCircuit[] = [
      {
        circuit_size: {
          current: 42934,
          delta: 589,
          percentage: 1.3909552485535481,
          previous: 42345,
        },
        name: "private_kernel_tail_to_public",
        opcodes: {
          current: 16335,
          delta: 439,
          percentage: 2.761701056869653,
          previous: 15896,
        },
      },
      {
        circuit_size: {
          current: 4324095,
          delta: 30738,
          percentage: 0.7159432583873179,
          previous: 4293357,
        },
        name: "rollup_block_root",
        opcodes: {
          current: 719198,
          delta: 36872,
          percentage: 5.403868532050662,
          previous: 682326,
        },
      },
      {
        circuit_size: {
          current: 1907311,
          delta: 6552,
          percentage: 0.34470440492455906,
          previous: 1900759,
        },
        name: "rollup_root",
        opcodes: {
          current: 38438,
          delta: 6048,
          percentage: 18.672429762272305,
          previous: 32390,
        },
      },
      {
        circuit_size: {
          current: 1907325,
          delta: 6552,
          percentage: 0.344701866030294,
          previous: 1900773,
        },
        name: "rollup_block_merge",
        opcodes: {
          current: 38454,
          delta: 6048,
          percentage: 18.663210516571006,
          previous: 32406,
        },
      },
      {
        circuit_size: {
          current: 89062,
          delta: 26,
          percentage: 0.02920167123410755,
          previous: 89036,
        },
        name: "private_kernel_inner",
        opcodes: {
          current: 46279,
          delta: 19,
          percentage: 0.041072200605274535,
          previous: 46260,
        },
      },
      {
        circuit_size: {
          current: 27501,
          delta: 8,
          percentage: 0.029098315934965265,
          previous: 27493,
        },
        name: "private_kernel_tail",
        opcodes: {
          current: 5348,
          delta: 6,
          percentage: 0.11231748408835641,
          previous: 5342,
        },
      },
      {
        circuit_size: {
          current: 48562,
          delta: 3,
          percentage: 0.006178051442575012,
          previous: 48559,
        },
        name: "private_kernel_init",
        opcodes: {
          current: 27955,
          delta: 2,
          percentage: 0.007154867098343648,
          previous: 27953,
        },
      },
      {
        circuit_size: {
          current: 10534892,
          delta: -2082811,
          percentage: -16.507053621407955,
          previous: 12617703,
        },
        name: "rollup_base_public",
        opcodes: {
          current: 2742614,
          delta: -1108638,
          percentage: -28.786431009967668,
          previous: 3851252,
        },
      },
      {
        circuit_size: {
          current: 9141878,
          delta: -2083047,
          percentage: -18.557335572398035,
          previous: 11224925,
        },
        name: "rollup_base_private",
        opcodes: {
          current: 2510946,
          delta: -1108827,
          percentage: -30.63250098832164,
          previous: 3619773,
        },
      },
    ];
    const expectedBrilligsDiff: DiffBrillig[] = [];

    const [actualCircuitsDiff, actualBrilligsDiff] = computeProgramDiffs(
      referenceReport.programs,
      compareReport.programs
    );

    expect(actualCircuitsDiff).toStrictEqual(expectedCircuitDiffs);
    expect(actualBrilligsDiff).toStrictEqual(expectedBrilligsDiff);

    const [summaryRows, fullReportRows] = formatCircuitRows(expectedCircuitDiffs, 0.8);
    fs.writeFileSync(
      "tests/mocks/1-2-program-acir.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        summaryRows,
        fullReportRows,
        true,
        false,
        undefined,
        0.8
      )
    );
  });
});
