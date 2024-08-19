import * as fs from "fs";

import { computeProgramDiffs, loadReports } from "../src/report";
import { DiffBrillig, DiffCircuit } from "../src/types";

const srcContent = fs.readFileSync("tests/mocks/gas_report.2.json", "utf8");
const cmpContent = fs.readFileSync("tests/mocks/gas_report.1.json", "utf8");

describe("Program diffs", () => {
  const srcProgramReports = loadReports(srcContent).programs;
  const cmpProgramReports = loadReports(cmpContent).programs;

  it("should diff 1 and 2 successfully", () => {
    const expectedDiffCircuits: DiffCircuit[] = [
      {
        name: "c",
        opcodes: { previous: 2, current: 4, delta: 2, percentage: 100 },
        circuit_size: { previous: 2, current: 8, delta: 6, percentage: 300 },
      },
      {
        name: "d",
        opcodes: { previous: 3, current: 4, delta: 1, percentage: 33.333333333333336 },
        circuit_size: { previous: 5, current: 8, delta: 3, percentage: 60 },
      },
      {
        name: "b",
        opcodes: { previous: 5, current: 4, delta: -1, percentage: -20 },
        circuit_size: { previous: 10, current: 8, delta: -2, percentage: -20 },
      },
    ];

    const expectedDiffBrilligs: DiffBrillig[] = [
      {
        name: "c",
        opcodes: { previous: 2, current: 4, delta: 2, percentage: 100 },
      },
      {
        name: "d",
        opcodes: { previous: 3, current: 4, delta: 1, percentage: 33.333333333333336 },
      },
      {
        name: "b",
        opcodes: { previous: 5, current: 4, delta: -1, percentage: -20 },
      },
    ];

    const expectedDiff = [expectedDiffCircuits, expectedDiffBrilligs];

    expect(computeProgramDiffs(srcProgramReports, cmpProgramReports)).toStrictEqual(expectedDiff);
  });

  it("should return zero diff for identical reports", () => {
    expect(computeProgramDiffs(srcProgramReports, srcProgramReports)).toStrictEqual([[], []]);
  });
});
