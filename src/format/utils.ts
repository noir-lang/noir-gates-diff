export enum TextAlign {
  LEFT = "left",
  RIGHT = "right",
  CENTER = "center",
}

export const center = (text: string, length: number) =>
  text.padStart((text.length + length) / 2).padEnd(length);

export const parenthesized = (input: string): string => "(" + input + ")";

export const plusSign = (num: number) => (num > 0 ? "+" : "");

export const alignPattern = (align = TextAlign.LEFT) => {
  switch (align) {
    case TextAlign.LEFT:
      return ":-";
    case TextAlign.RIGHT:
      return "-:";
    case TextAlign.CENTER:
      return ":-:";
  }
};

export const generateCommitInfo = (
  repository: string,
  commitHash: string,
  refCommitHash?: string
): string =>
  `> Generated at commit: [${commitHash}](/${repository}/commit/${commitHash})` +
  (refCommitHash
    ? `, compared to commit: [${refCommitHash}](/${repository}/commit/${refCommitHash})`
    : "");
