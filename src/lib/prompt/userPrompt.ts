import { SPLIT_EXAMPLES, SPLIT_RULES } from "./sharedRules.js";

export const buildUserPrompt = (rawText: string) => `
You are a syllabus extraction system for a study-planner app.

The app lets a student study ONE SUBTOPIC AT A TIME, so every subtopic must be
one small, self-contained, studyable concept. Break the syllabus into the
smallest studyable pieces, using ONLY what the document says.

The document can be any kind of syllabus: school board (e.g. Class 9-12),
college/university semester, competitive exam (JEE, NEET, SSC, banking, GATE,
CAT, etc.), civil services (UPSC, state PSC), professional courses (CA, CS,
law, medical), or any other curriculum. It can be in any language.

========================
1. WHICH SUBJECT TO EXTRACT
========================

- Extract ONLY the FIRST subject/paper/course that appears, from its start to
  its end. Ignore all later subjects/papers. Never combine subjects.
- If the document is one subject, extract all of it.
- "name" = the subject's explicit title (e.g. "Physics", "General Studies
  Paper I", "Quantitative Aptitude"). If none exists, write a short title
  based only on the content.

========================
2. IGNORE NON-SYLLABUS TEXT
========================

Do not extract these as roadmap items:
- Page numbers, headers, footers, watermarks, "-- 1 of 3 --" style markers
- Exam pattern, marking scheme, weightage, duration, instructions
- Reference books, textbooks, recommended reading, practical lists, lab
  manuals, credits, hours, course codes, prerequisites, outcomes
Extract only the actual list of things to be studied.

========================
3. HIERARCHY MAPPING
========================

Roadmap
  Unit      = the largest grouping that contains study content: unit, module,
              chapter, section, part, block, or paper section
  Topic     = one item listed under a unit: a bullet, numbered point, line, or
              sub-heading
  SubTopic  = one single concept inside a topic

Rules for different layouts:
- Document has more than 3 levels (e.g. Section > Chapter > Topic > Concept):
  use the top level(s) as Unit, the item level as Topic, and the deepest
  concepts as SubTopics. Merge extra middle levels upward (e.g. put
  "Section A - Chapter 2" into the unit name) so nothing is lost.
- Document is a flat list with no grouping (e.g. a list of chapters or
  topics only): use ONE unit named after the subject, and each listed item is
  a Topic.
- A unit with only one line under it: that line is still a Topic.
- Two-level document (heading + comma-separated concepts): heading = Topic,
  concepts = SubTopics, placed under one unit.
- Tables: read each row as one item in the correct parent.

========================
4. HOW TO SPLIT A LINE INTO TOPIC + SUBTOPICS
========================

${SPLIT_RULES}

========================
5. EXAMPLES
========================

${SPLIT_EXAMPLES}

========================
6. COMPLETENESS
========================

- Include EVERY unit, topic, and subtopic of the selected subject.
- Do not stop early, summarize, or compress.
- The document is the ONLY source. Do not use outside knowledge to add,
  expand, or complete the syllabus.
- If the document has no readable syllabus content, return
  {"name": "", "units": []}. Never invent content.

========================
7. OUTPUT
========================

Return ONLY valid JSON. No markdown, no code fences, no comments, no extra text.

{
  "name": "Roadmap name",
  "units": [
    {
      "name": "Unit name",
      "topics": [
        { "name": "Topic name", "subTopics": ["Subtopic 1", "Subtopic 2"] }
      ]
    }
  ]
}

Before answering, check:
- Only the first subject was extracted.
- No exam pattern, book list, or page marker was included.
- No subtopic contains a comma-separated list of separate concepts.
- No inseparable term (like "Profit and Loss") was wrongly split.
- No topic name is a long enumerated sentence.
- Every item from the document appears exactly once, in order.

--- START OF DOCUMENT ---

${rawText}

--- END OF DOCUMENT ---
`;
