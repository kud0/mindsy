import OpenAI from 'openai';
import { config } from './config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiKey,
});

/**
 * Represents a hierarchical folder structure
 * Can be nested to any depth: string for leaf folders, object for parent folders with children
 */
export interface FolderHierarchy {
  name: string;
  children?: (string | FolderHierarchy)[];
}

/**
 * Input parameters for course folder generation
 */
export interface CourseFolderInput {
  courseCode: string;
  courseName?: string;
  institution: string;
  typeOfStudy?: string;
  year?: string;
  semester?: string;
  syllabusUrl?: string;
}

/**
 * Result from folder generation
 */
export interface CourseFolderResult {
  success: boolean;
  folders?: (string | FolderHierarchy)[];
  error?: string;
}

/**
 * Generate course folder structure using OpenAI with web search
 * Uses Responses API with web_search tool to find typical course structure
 */
export async function generateCourseFoldersWithOpenAI(
  input: CourseFolderInput
): Promise<CourseFolderResult> {
  try {
    const { courseCode, courseName, institution, typeOfStudy, year, semester, syllabusUrl } = input;

    // Build the search query for OpenAI
    let searchQuery = `Find the typical course structure and syllabus for "${courseCode}"`;
    if (courseName) searchQuery += ` - ${courseName}`;
    searchQuery += ` at ${institution}`;
    if (typeOfStudy) searchQuery += ` (${typeOfStudy})`;
    if (semester) searchQuery += ` - ${semester}`;
    if (syllabusUrl) searchQuery += `. Check this syllabus URL: ${syllabusUrl}`;

    searchQuery += `. Return a JSON array of folders organized by semester and subjects.`;

    // Create the prompt for folder structure
    const prompt = `You are a web scraper specialized in extracting university course structures from official websites.

**CRITICAL INSTRUCTIONS:**
1. YOU MUST use web search to find REAL course data - DO NOT use your training knowledge
2. Act as a web scraper: extract exact structure from official university pages
3. Prioritize official syllabus pages, course catalogs, and university websites
4. If you find the actual course page, extract the EXACT semester/subject structure
5. DO NOT make up or hallucinate folder names - only use what you find on official pages

**Course Information:**
- Course Code: ${courseCode}
${courseName ? `- Course Name: ${courseName}` : ''}
- Institution: ${institution}
${typeOfStudy ? `- Type of Study: ${typeOfStudy}` : ''}
${year ? `- Year: ${year}` : ''}
${semester ? `- Semester: ${semester}` : ''}
${syllabusUrl ? `- Syllabus URL (PRIORITIZE THIS): ${syllabusUrl}` : ''}

**Your Task:**
1. Search the web for the official course page at ${institution}
2. If syllabusUrl is provided, start by scraping that page
3. Extract the EXACT course structure (semesters, subjects) from official sources
4. Return only what you found - do not invent subjects

**Output Format - CRITICAL INSTRUCTION:**

**YOUR ONLY JOB: Copy the EXACT folder hierarchy structure from the official website**

Look at how the university organizes the course on their official page and **mirror that exact structure** in JSON format.

**Examples of what you might find:**
- If the site organizes by Years → Semesters → Subjects, copy that 3-level structure
- If the site organizes by Semesters → Subjects, copy that 2-level structure
- If the site has a flat list of subjects, return a flat array
- If the site uses "Primer curso", "Segundo curso", "Optativas", use those EXACT names
- If the site uses "Year 1", "Year 2", use those EXACT names

**JSON Format Examples:**

3-level hierarchy (Year → Semester → Subjects):
{
  "folders": [
    {
      "name": "EXACT year/level name from site",
      "children": [
        {
          "name": "EXACT semester/period name from site",
          "children": ["EXACT subject names from site"]
        }
      ]
    }
  ]
}

2-level hierarchy (Semester → Subjects):
{
  "folders": [
    {
      "name": "EXACT semester name from site",
      "children": ["EXACT subject names from site"]
    }
  ]
}

Flat list (just subjects):
{
  "folders": ["EXACT subject names from site"]
}

**CRITICAL RULES:**
1. Find the official course structure page via web search
2. **COPY** the exact folder hierarchy structure you see on that page
3. Use the EXACT names (don't translate, don't change wording)
4. Preserve the EXACT depth of hierarchy (2 levels, 3 levels, or flat)
5. Include ALL folders/categories you find (don't limit or filter)
6. Match the organization system used by that specific university
7. Return ONLY the JSON object, no additional text or explanation

Return the folder structure as JSON:`;

    console.log('🔍 OpenAI Web Search Query:', searchQuery);
    console.log('📤 Sending request to OpenAI Responses API with web search...');

    const startTime = Date.now();

    // Use Responses API with web search tool
    // NOTE: Web search cannot be used with JSON mode, so we'll parse JSON manually
    const response = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
      tools: [
        {
          type: 'web_search'
        }
      ]
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ OpenAI Responses API call completed in ${elapsed}ms`);

    // Extract the generated content from Responses API
    const output = response.output;

    // The response structure from Responses API is an array with web_search_call and message objects
    let generatedText: string | undefined;

    if (Array.isArray(output)) {
      // Look for message object with content
      for (const item of output) {
        if (item.type === 'message' && item.content && Array.isArray(item.content)) {
          // Extract text from content array
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' && contentItem.text) {
              generatedText = contentItem.text;
              break;
            }
          }
          if (generatedText) break;
        } else if (item.type === 'output_text' && item.text) {
          generatedText = item.text;
          break;
        }
      }
    } else if (typeof output === 'string') {
      generatedText = output;
    }

    if (!generatedText) {
      console.error('❌ No output text found in response:', JSON.stringify(output, null, 2));
      return {
        success: false,
        error: 'OpenAI returned empty response'
      };
    }

    console.log('📝 OpenAI response received:', generatedText.substring(0, 200) + '...');

    // Extract JSON from response (OpenAI may wrap it in markdown or text)
    let jsonText = generatedText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      // Remove opening ```json or ``` and closing ```
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Find JSON object in text (handle cases where AI adds explanation)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse the JSON response
    let folderData: { folders: (string | FolderHierarchy)[] };
    try {
      folderData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', generatedText);
      console.error('Extracted JSON attempt:', jsonText);
      return {
        success: false,
        error: 'Failed to parse folder structure from AI response'
      };
    }

    // Validate the response structure
    if (!folderData.folders || !Array.isArray(folderData.folders)) {
      console.error('❌ Invalid folder structure:', folderData);
      return {
        success: false,
        error: 'AI response missing folders array'
      };
    }

    if (folderData.folders.length === 0) {
      console.warn('⚠️ OpenAI returned empty folders array');
      return {
        success: false,
        error: 'No folders generated'
      };
    }

    console.log(`✅ Generated ${folderData.folders.length} folders/hierarchies`);
    console.log('📁 Folder structure:', JSON.stringify(folderData.folders, null, 2));

    return {
      success: true,
      folders: folderData.folders
    };

  } catch (error) {
    console.error('❌ OpenAI course generation error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'OpenAI authentication failed - check API key'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'OpenAI rate limit exceeded - please try again later'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
