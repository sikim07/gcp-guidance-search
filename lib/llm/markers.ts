const HANGUL_LETTER: Array<readonly [string, string]> = [
  ["에이치", "H"],
  ["더블유", "W"],
  ["에프", "F"],
  ["에이", "A"],
  ["브이", "V"],
  ["비", "B"],
  ["씨", "C"],
  ["디", "D"],
  ["엘", "L"],
  ["엠", "M"],
  ["엔", "N"],
  ["오", "O"],
  ["피", "P"],
  ["큐", "Q"],
  ["알", "R"],
  ["에스", "S"],
  ["티", "T"],
  ["유", "U"],
  ["지", "G"],
  ["이", "E"],
];

const MARK = (key: string) => `[[MARK_${key}]]`;

/** Keep A. / (b) as Latin so machine translation does not turn B. into 비. */
export function protectLetterLabels(text: string): string {
  return text
    .replace(/(^|\n)([A-H])\.\s/g, (_m, pre: string, letter: string) => `${pre}${MARK(letter)}. `)
    .replace(/\(([a-h])\)/g, (_m, letter: string) => `(${MARK(letter.toUpperCase())})`);
}

export function restoreLetterLabels(text: string): string {
  let out = text.replace(/\[\[\s*MARK_([A-H])\s*\]\]/gi, (_m, letter: string) =>
    letter.toUpperCase(),
  );
  for (const [hangul, latin] of HANGUL_LETTER) {
    const line = new RegExp(`(^|\\n)${hangul}\\.\\s`, "g");
    out = out.replace(line, `$1${latin}. `);
    const paren = new RegExp(`\\(${hangul}\\)`, "g");
    out = out.replace(paren, `(${latin.toLowerCase()})`);
  }
  return out;
}
