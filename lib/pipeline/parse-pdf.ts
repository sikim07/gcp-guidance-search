export async function extractPdfText(bytes: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : text;
    return joined.replace(/\r\n/g, "\n").trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "pdf parse failed";
    throw new Error(message);
  }
}
