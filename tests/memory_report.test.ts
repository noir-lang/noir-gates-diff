import * as fs from "fs";

import { memoryReports, formatMemoryReport } from "../src/report";

const srcContent = fs.readFileSync("tests/mocks/mem_report.json", "utf8");

const memReports = memoryReports(srcContent);

describe("Markdown format", () => {
  it("should generate markdown format", () => {
    expect(memReports.length).toBeGreaterThan(0);
    const markdown = formatMemoryReport(memReports);
    expect(markdown.length).toBeGreaterThan(0);
  });
});
