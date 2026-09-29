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

Syllabus lines often pack many concepts into one sentence. Split them.

a) Topic name = a short label (2-8 words).
   - If the line has a lead-in before a colon or dash
     ("Recording transactions: ..."), use that lead-in.
   - If the line is short and names one concept, use the line itself.
   - Otherwise build a short label using only words from the line.
   - Never use a long enumerated sentence as a topic name.

b) SubTopics = split the rest of the line at commas, semicolons, dashes,
   numbered/bulleted items, and "and"/"or" when they join SEPARATE concepts.
   Each piece is its own string in "subTopics".

c) Do NOT split names that are one inseparable concept. Examples that stay
   whole: "Profit and Loss", "Simple and Compound Interest", "Acids, Bases
   and Salts" (when it is a chapter name), "Right to Equality", "Laws of
   Motion", "Sine and Cosine rules".
   Split only when the parts can be studied independently.

d) Parentheses and "including/such as/like": treat the items inside as
   subtopics of the item before them.
   "Fundamental Rights (Articles 12-35, DPSP, Fundamental Duties)" becomes
   Topic "Fundamental Rights", subtopics: "Articles 12-35", "DPSP",
   "Fundamental Duties".
   Keep short qualifiers that belong to one concept
   (e.g. "Interference (Young's double slit)" stays one subtopic).

e) Make every subtopic self-contained. When items share a noun or verb,
   repeat it so each stands alone.
   "Meaning, basis and technique of inventory valuation" becomes
   "Meaning of inventory valuation", "Basis of inventory valuation",
   "Technique of inventory valuation".

f) A subtopic is ONE concept: no comma-separated list, no long sentence. If a
   subtopic still holds several concepts, split it again.

g) Keep the original wording and language. Add only the minimum words needed
   for (e). Fix obvious typos and OCR errors only. Never translate.
   Do not explain, define, or add anything not in the text.

h) If a line is one concept with nothing to split, make it a Topic with
   "subTopics": [].

i) Never drop, merge, or invent items. Keep the original order.

========================
5. EXAMPLES
========================

--- Example A: school (Class 12 Physics) ---
Document:
Unit III: Current Electricity
Electric current, drift velocity, Ohm's law, resistivity; Kirchhoff's rules,
Wheatstone bridge, metre bridge

Output for this unit:
{ "name": "Current Electricity", "topics": [
  { "name": "Electric current and resistance", "subTopics": [
      "Electric current", "Drift velocity", "Ohm's law", "Resistivity"] },
  { "name": "Circuit laws and bridges", "subTopics": [
      "Kirchhoff's rules", "Wheatstone bridge", "Metre bridge"] } ] }

--- Example B: UPSC ---
Document:
Indian Polity and Governance
Constitution: historical underpinnings, evolution, features, amendments,
significant provisions and basic structure.
Parliament and State Legislatures: structure, functioning, conduct of
business, powers and privileges.

Output for this unit:
{ "name": "Indian Polity and Governance", "topics": [
  { "name": "Constitution", "subTopics": [
      "Historical underpinnings of the Constitution",
      "Evolution of the Constitution", "Features of the Constitution",
      "Amendments", "Significant provisions", "Basic structure"] },
  { "name": "Parliament and State Legislatures", "subTopics": [
      "Structure of Parliament and State Legislatures",
      "Functioning of Parliament and State Legislatures",
      "Conduct of business", "Powers and privileges"] } ] }

--- Example C: college semester ---
Document:
Module 2 (8 hrs): Process Management - process concepts, scheduling
algorithms (FCFS, SJF, Round Robin), deadlocks (detection, prevention,
avoidance)

Output for this unit:
{ "name": "Module 2: Process Management", "topics": [
  { "name": "Process concepts", "subTopics": [] },
  { "name": "Scheduling algorithms", "subTopics": [
      "FCFS", "SJF", "Round Robin"] },
  { "name": "Deadlocks", "subTopics": [
      "Deadlock detection", "Deadlock prevention", "Deadlock avoidance"] } ] }

--- Example D: competitive exam, flat list ---
Document:
Quantitative Aptitude: Percentage, Profit and Loss, Simple and Compound
Interest, Time and Work, Ratio and Proportion

Output: one unit named "Quantitative Aptitude" containing five topics, each
with "subTopics": [] (the names are inseparable concepts).

WRONG (never do this):
"subTopics": ["Meaning, basis and technique of inventory valuation, cost of inventory, net realizable value and record system"]

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
