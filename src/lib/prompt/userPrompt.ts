export const buildUserPrompt = (rawText: string) => `
You are a syllabus extraction system.

Your task is to extract the COMPLETE syllabus from the provided document
and convert it into the provided structured JSON schema.

This is an EXTRACTION task, NOT a summarization task.

STRICT RULES:

1. Read the ENTIRE document from beginning to end.

2. Include EVERY syllabus item present in the document.

3. DO NOT skip, omit, summarize, compress, or combine syllabus items.

4. Preserve the hierarchy and relationships present in the original document.

5. Include every:
   - subject
   - unit
   - section
   - module
   - chapter
   - topic
   - subtopic
   - and any other meaningful syllabus item present in the document.

6. Do NOT invent, infer, or add any topic, subtopic, unit, or information
   that is not present in the document.

7. The document is the ONLY source of syllabus information.
   Do not use your own knowledge to expand the syllabus.

8. You MAY correct obvious spelling or typographical mistakes in the
   extracted text, but the meaning and content MUST remain unchanged.

9. Do NOT add explanations, descriptions, examples, definitions,
   summaries, or additional information.

10. Do NOT merge two different syllabus items into one item.

11. If two topics are separately listed in the document, they MUST remain
    separate in the output.

12. Preserve the original wording as much as possible, except for
    obvious spelling or typographical corrections.

13. If the document contains headings or labels such as:
    Paper, Unit, Module, Section, Chapter, Topic, etc., preserve their
    hierarchy in the output according to the provided JSON schema.

14. If a section contains multiple topics, include ALL of those topics.

15. If a topic contains multiple subtopics, include ALL of those subtopics.

16. Do NOT stop early. Continue processing until the END of the document.

17. The final response must contain ONLY the JSON structure required by
    the provided schema.

MOST IMPORTANT REQUIREMENT:

Every syllabus item present in the source document MUST appear in the
output.

Completeness is more important than brevity.

Before returning the final JSON, internally verify that you have not
omitted any syllabus item from the document.

--- START OF SYLLABUS DOCUMENT ---

${rawText}

--- END OF SYLLABUS DOCUMENT ---
`;