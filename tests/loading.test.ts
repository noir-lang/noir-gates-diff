import * as fs from "fs";

import { loadReports } from "../src/report";

const srcContent = fs.readFileSync("tests/mocks/gas_report.2.json", "utf8");
const cmpContent = fs.readFileSync("tests/mocks/gas_report.1.json", "utf8");

describe("Report Loading", () => {
  it("should load 1 successfully", () => {
    console.log(loadReports(srcContent));
  });

  it("should load 2 successfully", () => {
    console.log(loadReports(cmpContent));
  });
});
