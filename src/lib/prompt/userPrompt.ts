export const buildUserPrompt = (rawText: string) => `
You are a roadmap extraction system.

Your task is to extract ONE COMPLETE STUDY ROADMAP from the provided document
and convert it into the required structured JSON schema.

This is an EXTRACTION task, NOT a summarization task.

IMPORTANT: The output must represent ONLY ONE SUBJECT/ROADMAP.

========================
ROADMAP SELECTION RULE
========================

1. If the document contains multiple subjects, papers, courses, or major
   independent subjects, select ONLY THE FIRST SUBJECT that appears in the
   document.

2. Once the first subject/roadmap is identified, extract only the content
   belonging to that subject.

3. Completely ignore all other subjects, papers, courses, or independent
   subjects that appear after the first one.

4. Do NOT combine multiple subjects into a single roadmap.

5. If the document contains only one subject, extract that complete subject.

6. The selected subject must be extracted completely from its beginning to
   its end, including all of its units, topics, and subtopics.

========================
ROADMAP NAME RULE
========================

7. The JSON must contain a "name" field for the roadmap.

8. If the selected subject has an explicit name/title in the document,
   use that name as the roadmap name.

9. If the document does not contain a clear subject/roadmap name, generate
   a short and meaningful roadmap name based ONLY on the content of the
   selected subject.

10. Do NOT invent a subject that is unrelated to the document.

11. The generated roadmap name must be concise and suitable for displaying
    as the title of a study roadmap.

========================
EXTRACTION RULES
========================

12. Read the provided document carefully from beginning to end.

13. Include EVERY roadmap item belonging to the selected subject.

14. Do NOT skip, omit, summarize, compress, combine, or merge roadmap items.

15. Preserve the hierarchy and relationships present in the original
    document.

16. Extract the hierarchy into:

    Roadmap
      └── Units
            └── Topics
                  └── SubTopics

17. A Unit represents a meaningful unit, module, section, chapter, paper
    section, or equivalent organizational level in the document.

18. A Topic represents an individual study topic inside a unit.

19. A SubTopic represents an individual smaller concept/item explicitly
    listed under a topic.

20. Preserve the original wording as much as possible.

21. You may correct obvious spelling or typographical mistakes, but do not
    change the meaning or content.

========================
TOPIC AND SUBTOPIC SEPARATION
========================

22. EVERY topic must be a separate item in the "topics" array.

23. NEVER combine multiple topics into one topic.

24. If the document lists:

    Topic A, Topic B, Topic C

    the output MUST contain:

    "topics": [
      { "name": "Topic A", ... },
      { "name": "Topic B", ... },
      { "name": "Topic C", ... }
    ]

25. NEVER treat commas as proof that multiple items should be combined.

26. If a line contains multiple separately listed concepts separated by
    commas, semicolons, bullets, numbering, line breaks, or similar
    delimiters, identify each distinct study item and store each one as a
    separate topic or subtopic according to the document hierarchy.

27. NEVER create comma-separated lists inside a single "name" field when
    those comma-separated items represent separate study concepts.

28. EVERY subtopic must be a separate string in the "subTopics" array.

29. For example, if the document contains:

    "Variables, Data Types, Operators, Expressions"

    and these are individual study items, output them separately:

    "subTopics": [
      "Variables",
      "Data Types",
      "Operators",
      "Expressions"
    ]

30. Do NOT output:

    "subTopics": [
      "Variables, Data Types, Operators, Expressions"
    ]

31. If a topic has multiple subtopics, ALL of them must be extracted
    individually.

32. If a topic has no explicitly listed subtopics, return an empty array:

    "subTopics": []

33. Do NOT invent subtopics for a topic that does not contain any.

========================
COMPLETENESS RULES
========================

34. Include EVERY unit belonging to the selected subject.

35. Include EVERY topic belonging to every extracted unit.

36. Include EVERY explicitly listed subtopic belonging to every topic.

37. Do NOT stop early.

38. Continue processing until the END of the selected subject.

39. Do NOT use your own knowledge to expand, explain, or complete the
    syllabus.

40. The document is the ONLY source of roadmap information.

41. Do NOT add explanations, descriptions, examples, definitions,
    summaries, prerequisites, or additional information.

42. Do NOT merge two different roadmap items into one item.

43. If two topics are separately listed in the document, they MUST remain
    separate.

44. If two subtopics are separately listed in the document, they MUST remain
    separate.

========================
HIERARCHY RULES
========================

45. Preserve headings and labels such as:

    Unit
    Module
    Section
    Chapter
    Topic
    Subtopic
    Paper

    according to their actual hierarchy in the selected subject.

46. Do not create unnecessary hierarchy levels that are not supported by
    the document.

47. If the document uses a different label for a grouping, map it to the
    closest appropriate level in:

    Unit → Topic → SubTopic

48. Keep every study item under the correct parent unit/topic.

========================
OUTPUT FORMAT
========================

Return ONLY valid JSON matching this exact structure:

{
  "name": "Roadmap name",
  "units": [
    {
      "name": "Unit name",
      "topics": [
        {
          "name": "Topic name",
          "subTopics": [
            "Subtopic 1",
            "Subtopic 2"
          ]
        }
      ]
    }
  ]
}

Do NOT return Markdown.

Do NOT return code fences.

Do NOT return explanations.

Do NOT return comments.

Do NOT return any text before or after the JSON.

========================
FINAL VERIFICATION
========================

Before returning the JSON, internally verify:

- Only the FIRST subject/major subject was extracted.
- Other subjects were excluded.
- The roadmap has a valid name.
- Every unit from the selected subject is included.
- Every topic is individually separated.
- Every subtopic is individually separated.
- No comma-separated study items were incorrectly merged.
- No roadmap item was invented.
- No roadmap item was omitted.
- The hierarchy is preserved.
- The final response is valid JSON matching the required schema.

Completeness and correct separation of study items are more important than
brevity.

--- START OF ROADMAP DOCUMENT ---

${rawText}

--- END OF ROADMAP DOCUMENT ---
`;



// export const buildUserPrompt = (rawText: string) => `
// Extract the study syllabus from the document below.

// Return ONLY valid JSON in exactly this structure:

// {
//   "name": "string",
//   "units": [
//     {
//       "name": "string",
//       "topics": [
//         {
//           "name": "string",
//           "subTopics": ["string"]
//         }
//       ]
//     }
//   ]
// }

// Rules:

// - Extract only the first subject found in the document.
// - Include all units belonging to that subject.
// - Include all topics under each unit.
// - Include all explicitly listed subtopics.
// - Do not invent information.
// - If a topic has no subtopics, use an empty array.
// - Keep the original wording as much as possible.
// - Do not summarize.
// - Do not return Markdown.
// - Do not return explanations.

// DOCUMENT:

// ${rawText}
// `;