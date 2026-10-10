// Line-splitting rules and examples shared by the legacy upload prompt (userPrompt.ts)
// and the pass-2 extraction prompt (extractPrompt.ts).

export const SPLIT_RULES = `Syllabus lines often pack many concepts into one sentence. Split them.

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

i) Never drop, merge, or invent items. Keep the original order.`;

export const SPLIT_EXAMPLES = `--- Example A: school (Class 12 Physics) ---
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
"subTopics": ["Meaning, basis and technique of inventory valuation, cost of inventory, net realizable value and record system"]`;
