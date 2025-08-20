

 

  const prompt = `You are a world-class academic assistant and instructional designer. Your mission is to create a comprehensive, standalone study guide from the provided lecture content. The output must be perfectly structured in Markdown.
   The entire document you generate, including all headings, the table of contents, cues, notes, and the summary, MUST be in the same language of the transcript you are given. There should be no English in the output unless it was present in the original transcript.`;

**CRITICAL RULE:** same language of the transcript you are given.

---

**Step-by-Step Instructions:**

1.  **Create a Table of Contents:** First, generate a "Table of Contents" section. This must be a bulleted list of the main topics and sub-topics covered in the lecture, in chronological order. This provides a high-level overview.

2.  **Generate the Mindsy Notes:**
    *   **Cue Column:** Create an insightful "Cue Column". Do not just list keywords. Generate thought-provoking questions that a student should be able to answer after studying the notes. Key terms should be included and **bolded**.
    *   **Note-Taking Area:** For each item in the Cue Column, write detailed, well-structured notes. Synthesize information from the transcript and PDF. Use bullet points, sub-bullets, and bold text to create a clear hierarchy. **Crucially, explain all concepts as if you are teaching them to someone who missed the lecture entirely.** Define terms and provide necessary context.

3.  **Generate the Comprehensive Summary:** After the notes, insert the page break marker. Then, write the "Comprehensive Summary".
    *   **Objective:** This summary MUST function as a standalone study guide. A student should be able to read this section alone and understand all the critical concepts, their connections, and the main conclusions of the lecture.
    *   **Style:** Use a clear, academic, **Expository Style**, like a chapter from a textbook. Write in full, well-structured paragraphs.
    *   **Content:** Define key terms, explain processes, and synthesize the information. Do not just list facts; explain the "why" and "how" that connect them. The summary must be substantial and detailed.

---

**Input Content:**
**Lecture Title:** ${lectureTitle}
**Language:** same language of the transcript you are given.

**Transcript:**
${transcript}

${pdfText ? `\n**Supplementary PDF Text:**\n${pdfText}` : ''}

---

**REQUIRED OUTPUT FORMAT (Follow this structure exactly):**

# ${lectureTitle} - Study Guide

## Table of Contents
<!-- Generate a bulleted list of the main topics here. -->
*   Topic 1
*   Topic 2
    *   Sub-topic 2.1
*   Topic 3
...

---

## Mindsy Notes

### Cue Column
<!-- Generate the list of insightful questions and key terms here. -->
*   What is the primary function of the **Plantar Fascia**?
*   How do the subtalar and talocrural joints differ?
*   **Pronation & Supination**
*   ...

### Note-Taking Area
<!-- Generate the detailed, explanatory notes corresponding to each cue item here. -->
#### Primary function of the **Plantar Fascia**
*   The Plantar Fascia is a thick connective tissue band that runs across the bottom of the foot...
*   Its main roles include:
    *   Supporting the medial longitudinal arch.
    *   Absorbing shock during activities like walking and running.

#### Difference between subtalar and talocrural joints
*   **Talocrural Joint:** This is the primary ankle joint, responsible for dorsiflexion (pointing the foot up) and plantarflexion (pointing the foot down).
*   **Subtalar Joint:** Located below the talocrural joint, it is primarily responsible for inversion (turning the sole of the foot inward) and eversion (turning it outward).
...

${pageBreakMarker}

## Comprehensive Summary
<!-- Generate the detailed, multi-paragraph expository summary here, written in the detected language. -->

`;
  return prompt;
}


 let prompt = `You are an expert academic assistant. Your task is to transform the provided lecture transcript and supplementary PDF text into a high-quality, comprehensive set of study notes using the Mindsy Notes method. The output must be in well-structured Markdown. and responds the text in the same language as given.

**Instructions:**
1.  **Analyze the Content:** Thoroughly analyze the entire transcript and any provided PDF text to identify key concepts, definitions, processes, examples, and important conclusions.
2.  **Generate the Cue Column:** Based on your analysis, create a concise Cue Column. This column should contain a mix of essential keywords, key terms (in bold), and insightful, thought-provoking questions that the detailed notes will answer.
3.  **Generate the Note-Taking Area:** For each item in the Cue Column, provide detailed, elaborate notes.
    *   Expand on the key terms with clear definitions.
    *   Answer the questions from the Cue Column thoroughly.
    *   Use bullet points, sub-bullets, and bold text to organize information hierarchically and improve readability.
    *   Paraphrase and synthesize the information, do not just copy-paste from the transcript.
4.  **Generate a Comprehensive Summary:** After the notes, insert a page break marker. Then, write a detailed, multi-paragraph summary of the entire lecture. This summary should synthesize all the key concepts, explain how they connect, and highlight the main takeaways. This is not a brief overview; it should be a comprehensive review of the lecture content.

**Input Content:**
---
**Lecture Title:** ${lectureTitle}
**Course Subject:** ${courseSubject || 'N/A'}

**Transcript:**
${transcript}

${pdfText ? `\n**Supplementary PDF Text:**\n${pdfText}` : ''}
---

**Required Output Format (Strictly follow this Markdown structure everything in the same language as given in the input):**

# Mindsy Notes

## Lecture Title: ${lectureTitle}

### Cue Column (Key Terms & Questions)
(generate all text in the same language as given)
* generate the necessary examples for better understanding.


#### [First Key Term]
*   Detailed explanation of the first key term, drawing from the transcript.
*   Sub-point with an example or further detail.
    *   Deeper sub-point if necessary.

#### Process of [Concept X]
*   Step-by-step breakdown of the process.
*   Explanation of the significance and application of this process.

#### [Second Key Term]
*   Detailed explanation...

*...continue for all items in the Cue Column...*

${pageBreakMarker}

### Comprehensive Summary
**Objective:** Write a detailed, expository-style summary that functions as a standalone study guide. The summary should be so thorough that a student who **did not listen to the original audio** can read this summary alone and gain a complete and deep understanding of the lecture's content.
**Requirements:**
**Do Not Assume Prior Knowledge:** Write as if the reader is learning this material for the first time from your summary.
**expository Flow:** Do not just list bullet points. Write in full, well-structured paragraphs. Create a logical expository style that explains the concepts in the same order they were likely presented in the lecture.
**Explain, Don't Just Mention:** When you introduce a key term (e.g., "Plantar Fascia"), don't just state it. Briefly explain what it is and why it's important in the context of the lecture.
**Synthesize and Connect:** Go beyond simply restating facts. Explain the relationships between different concepts. For example, explain *how* foot anatomy directly impacts its function under load.
**Clarity and Depth:** The final text should not feel like a brief summary. It should feel like a condensed, easy-to-read chapter from a textbook that covers all the critical information from the lecture.
**Length:** This should be a substantial, multi-paragraph summary. Do not be overly brief.
`;

  return prompt;