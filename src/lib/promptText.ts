// Text sent to the LLM is capped to keep the prompt within budget
export const MAX_PROMPT_TEXT_CHARS = 20_000;

// Cap the text sent to the LLM. Cut at a line break when one is reasonably close to the
// limit, so the last syllabus line isn't sent half-finished.
export function capPromptText(text: string, maxChars = MAX_PROMPT_TEXT_CHARS) {
  if (text.length <= maxChars) {
    return { promptText: text, truncated: false };
  }
  const hardCut = text.slice(0, maxChars);
  const lastNewline = hardCut.lastIndexOf("\n");
  const promptText = lastNewline > maxChars * 0.8 ? hardCut.slice(0, lastNewline) : hardCut;
  return { promptText, truncated: true };
}
