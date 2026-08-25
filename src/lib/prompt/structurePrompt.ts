// export const buildStructurePrompt = (text: string) => `
// You are a document structure analysis system.

// Analyze the syllabus document below.

// Your task is ONLY to identify the hierarchical structure
// of the syllabus.

// Do NOT summarize the syllabus.
// Do NOT add information that is not present.
// Do NOT invent subjects, units, topics, or subtopics.

// Identify meaningful hierarchy such as:

// - exam
// - paper
// - subject
// - section
// - unit
// - module
// - chapter
// - topic
// - subtopic

// Different documents may use different terminology.
// Do not assume that every document has the same hierarchy.

// Preserve the original names used in the document.

// If the role of a section is unclear, use "unknown".

// Return the structure according to the provided JSON schema.

// --- DOCUMENT START ---

// ${text}

// --- DOCUMENT END ---
// `;