import * as fs from "fs";

import { memoryReports, formatMemoryReport, computeMemoryDiff } from "../src/report";

const srcContent = fs.readFileSync("tests/mocks/mem_report.json", "utf8");
const ref_1_Content = fs.readFileSync("tests/mocks/1-1-mem_report.json", "utf8");
const ref_2_Content = fs.readFileSync("tests/mocks/1-2-mem_report.json", "utf8");

const memReports = memoryReports(srcContent);

describe("Markdown format", () => {
  it("should generate markdown format", () => {
    expect(memReports.length).toBeGreaterThan(0);
    const markdown = formatMemoryReport(memReports);
    expect(markdown.length).toBeGreaterThan(0);
  });

  it("should generate diff report format", () => {
    const ref_1_Reports = memoryReports(ref_1_Content);
    const ref_2_Reports = memoryReports(ref_2_Content);
    expect(ref_1_Reports.length).toBeGreaterThan(0);
    expect(ref_1_Reports.length).toBe(ref_2_Reports.length);
    const markdown = computeMemoryDiff(ref_1_Reports, ref_2_Reports);
    expect(markdown.length).toBeGreaterThan(0);
  });
});
