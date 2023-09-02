import * as fs from "fs";

import { computeProgramDiffs, loadReports } from "../src/report";
import { DiffProgram } from "../src/types";

const srcContent = fs.readFileSync("tests/mocks/gas_report.2.json", "utf8");
const cmpContent = fs.readFileSync("tests/mocks/gas_report.1.json", "utf8");

describe("Program diffs", () => {
  const srcProgramReports = loadReports(srcContent).programs;
  const cmpProgramReports = loadReports(cmpContent).programs;

  it("should diff 1 and 2 successfully", () => {
    const expectedDiff: DiffProgram[] = [
      {
        name: "b",
        acir_opcodes: { previous: 5, current: 4, delta: -1, prcnt: -20 },
        circuit_size: { previous: 10, current: 8, delta: -2, prcnt: -20 },
      },
    ];
    expect(computeProgramDiffs(srcProgramReports, cmpProgramReports)).toStrictEqual(expectedDiff);
  });

  it("should return zero diff for identical reports", () => {
    expect(computeProgramDiffs(srcProgramReports, srcProgramReports)).toStrictEqual([]);
  });
});
