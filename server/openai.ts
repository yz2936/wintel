const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2-chat-latest';

export interface Contact {
  name: string;
  title: string;
  linkedinUrl: string;
  relevance: string;
  avatarUrl?: string;
}

export interface KeywordInsight {
  term: string;
  summary: string;
  sourceUrl: string;
}

export interface NewsResponse {
  text: string;
  contacts: Contact[];
  keywords: KeywordInsight[];
  groundingChunks: Array<{ web: { uri: string; title: string } }>;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  opco: string;
}

const newsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string' },
    contacts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          linkedinUrl: { type: 'string' },
          relevance: { type: 'string' },
          avatarUrl: { type: 'string' }
        },
        required: ['name', 'title', 'linkedinUrl', 'relevance', 'avatarUrl']
      }
    },
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          term: { type: 'string' },
          summary: { type: 'string' },
          sourceUrl: { type: 'string' }
        },
        required: ['term', 'summary', 'sourceUrl']
      }
    }
  },
  required: ['text', 'contacts', 'keywords']
} as const;

const timelineSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          opco: { type: 'string' }
        },
        required: ['date', 'title', 'description', 'opco']
      }
    }
  },
  required: ['events']
} as const;

export async function fetchNews(
  opcos: string[],
  functions: string[],
  userQuery?: string,
  fileContext?: string,
  userProfile?: string
): Promise<NewsResponse> {
  const targetContext = opcos.length > 0
    ? `the following specific Operating Companies (OpCos): ${opcos.join(', ')}`
    : 'the broader US utility and energy industry';

  const functionContext = functions.length > 0
    ? `Focus specifically on the following functional areas: ${functions.join(', ')}.`
    : 'Focus on general news, regulatory updates, and major trends.';

  const queryContext = userQuery
    ? `\nUSER SPECIFIC QUESTION: "${userQuery}"\nCRITICAL: Prioritize answering this specific question while applying the strategic lens defined below.`
    : '';

  const fileInfo = fileContext
    ? `\nADDITIONAL CONTEXT FROM UPLOADED FILE:\n${fileContext}\n`
    : '';

  const personaContext = userProfile
    ? `\nACCOUNT MANAGER PERSONA: Tailor the narrative, storyline, and insights specifically for a user with the following capabilities and skillsets: "${userProfile}". Speak their professional language, frame the news in a way that aligns with their expertise, and highlight opportunities that match their skills.`
    : '\nACCOUNT MANAGER PERSONA: Tailor the narrative for a general enterprise sales or account management professional.';

  const modeContext = userQuery ? `
    USER INTERACTION MODE:
    The user has asked a specific question: "${userQuery}".

    CRITICAL INSTRUCTIONS FOR QUESTION MODE:
    1. ONLY answer the specific question asked. Do NOT provide the full strategic report structure.
    2. BE CONCISE and TARGETED.
    3. Use Markdown for formatting the answer.
    4. Prioritize recency, commercial opportunity, relevant stakeholders, and practical talking points where applicable.
    5. Still identify 3-5 critical keywords from your answer for the keywords field.
  ` : `
    REPORT MODE:
    Provide a comprehensive strategic intelligence report optimized for account planning.

    For EACH selected OpCo (or the main company if no OpCo is selected), structure your analysis with these headings:

    # [OpCo Name]

    ## Recency & Material News
    Focus on what is most recent, what changed, and why it matters now.

    ## Insights & Opportunities
    Explain the commercial implications, likely buying signals, urgency, funding paths, or near-term openings.

    ## Key Client Stakeholders
    Identify the client roles or named stakeholders implicated by the news and why each matters.

    ## Talking Points & Attack Strategy
    Give specific outreach angles, meeting talking points, objections to anticipate, and next-step actions for the account team.
  `;

  const prompt = `
    Analyze the recent news specifically for ${targetContext}.
    ${functionContext}
    ${queryContext}
    ${fileInfo}

    CRITICAL INSTRUCTION: You MUST break down your analysis specifically by the selected OpCos. Do not generalize to the parent holding company level unless the news explicitly applies to all OpCos.
    ${personaContext}
    ${modeContext}

    SOURCE QUALITY RULES:
    1. Prioritize professional and primary sources only: government websites, regulators, utilities commissions, ISO/RTO sites, company press releases, SEC filings, investor relations pages, earnings materials, major business press, and reputable industry/trade publications.
    2. Prefer official documents and direct company or government sources over commentary whenever possible.
    3. Avoid Reddit, social media, forums, low-credibility blogs, SEO content farms, and user-generated discussion sites unless no higher-quality source exists.
    4. If a weaker source is the only source available for a claim, either omit the claim or clearly favor better-supported claims instead.
    5. For regulatory, permitting, infrastructure, utility, or public funding topics, prefer federal, state, commission, grid operator, or company primary-source material.

    PRESENTATION RULES:
    1. DO NOT include a standalone section titled "Keywords", "Key Terms", or anything similar.
    2. DO NOT add a separate keyword appendix, glossary, or source list inside the main markdown body.
    3. Instead, naturally weave the important strategic terms directly into the report text so they can be highlighted inline.

    KEYWORD EXTRACTION:
    Identify 3-5 critical strategic terms or technical concepts from your response and wrap them in **double asterisks**.
    For each keyword provide the exact term, a concise summary, and a direct source URL from a professional or primary source if you found one through web search. If you did not find a credible direct URL, return an empty string.

    CONTACT IDENTIFICATION:
    Identify 2-3 real decision makers or relevant sales contacts for the selected OpCos.
    Prefer company leadership pages, investor relations governance pages, official bios, or LinkedIn profile URLs. Do not use Reddit, forums, or low-quality people-search sources.
  `;

  const parsed = await requestStructured<NewsResponse>({
    input: prompt,
    schemaName: 'wintel_news_response',
    schema: newsSchema
  });

  return {
    text: parsed.text,
    contacts: parsed.contacts,
    keywords: parsed.keywords,
    groundingChunks: []
  };
}

export async function fetchPlanOfAttack(reportText: string, userProfile: string): Promise<string> {
  const prompt = `
    You are an expert sales strategist and enterprise account manager.
    Based on the following intelligence report, create a comprehensive Plan of Attack strategy for working with the client stakeholders identified.

    ACCOUNT MANAGER PERSONA: ${userProfile || 'General Enterprise Sales'}
    CRITICAL INSTRUCTION: Speak the language of the persona.

    INTELLIGENCE REPORT:
    ${reportText}

    Format the output in clean, highly readable Markdown. Include:
    # Plan of Attack
    ## 1. Executive Summary of the Approach
    ## 2. Stakeholder Engagement Strategy
    ## 3. 30-60-90 Day Action Plan
    ## 4. Tailored Value Proposition & Pitch
  `;

  return requestText({ input: prompt });
}

export async function fetchFocusSummary(input: {
  companyName?: string | null;
  opcos: string[];
  functions: string[];
  selectedYear?: number | null;
  userProfile?: string;
  lastUserPrompt?: string;
  lastAssistantSummary?: string;
}): Promise<string> {
  const prompt = `
    You are helping an enterprise account development user stay oriented.

    Summarize the current workspace focus in 2 sentences maximum.
    The summary must be concise, commercially useful, and written in plain business language.
    Mention:
    - the target account
    - the current angle or lens
    - what the user should focus on next

    CURRENT CONTEXT:
    Target company: ${input.companyName || 'No company selected'}
    Selected OpCos: ${input.opcos.length > 0 ? input.opcos.join(', ') : 'All relevant entities'}
    Functional focus: ${input.functions.length > 0 ? input.functions.join(', ') : 'General lens'}
    Timeline focus: ${input.selectedYear || 'Next 5 years'}
    User persona: ${input.userProfile || 'General account development'}
    Latest user prompt: ${input.lastUserPrompt || 'None yet'}
    Latest assistant output excerpt: ${input.lastAssistantSummary || 'None yet'}

    Return only the paragraph text.
  `;

  return requestText({ input: prompt });
}

export async function fetchTimeline(opcos: string[], functions: string[], year?: number | null): Promise<TimelineEvent[]> {
  const targetContext = opcos.length > 0
    ? `the following specific Operating Companies (OpCos): ${opcos.join(', ')}`
    : 'the broader US utility and energy industry';

  const functionContext = functions.length > 0
    ? `Focus specifically on the following functional areas: ${functions.join(', ')}.`
    : 'Focus on general news, regulatory updates, and major trends.';

  let dateConstraint = '';
  if (year) {
    dateConstraint = `ONLY include future, planned, or projected events that occur between exactly ${year}-01-01 and ${year}-12-31.`;
  } else {
    const currentDate = new Date().toISOString().split('T')[0];
    const fiveYearsOut = new Date();
    fiveYearsOut.setFullYear(fiveYearsOut.getFullYear() + 5);
    dateConstraint = `ONLY include future, planned, or projected events that occur between today (${currentDate}) and 5 years from now (${fiveYearsOut.toISOString().split('T')[0]}).`;
  }

  const prompt = `
    Analyze recent news, regulatory filings, and strategic plans for ${targetContext}.
    ${functionContext}

    Identify 5 to 10 major future milestones, regulatory decisions, project announcements, or significant strategic events.
    CRITICAL INSTRUCTION: ${dateConstraint}
    Return the events in chronological order from oldest to newest.
  `;

  const response = await requestStructured<{ events: TimelineEvent[] }>({
    input: prompt,
    schemaName: 'wintel_timeline_response',
    schema: timelineSchema
  });

  return response.events;
}

async function requestText({ input }: { input: string }): Promise<string> {
  const payload = await requestOpenAI({
    model: DEFAULT_MODEL,
    input,
    tools: [{ type: 'web_search' }]
  });

  const text = sanitizeModelText(extractOutputText(payload)).trim();
  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }

  return text;
}

async function requestStructured<T>({ input, schemaName, schema }: { input: string; schemaName: string; schema: object }): Promise<T> {
  const payload = await requestOpenAI({
    model: DEFAULT_MODEL,
    input,
    tools: [{ type: 'web_search' }],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema
      }
    }
  });

  const text = sanitizeModelText(extractOutputText(payload)).trim();
  if (!text) {
    throw new Error('OpenAI returned an empty structured response.');
  }

  return JSON.parse(text) as T;
}

async function requestOpenAI(body: Record<string, unknown>): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Add it to .env.local before using the AI features.');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  return response.json();
}

function extractOutputText(payload: any): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const parts: string[] = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if ((content.type === 'output_text' || content.type === 'text') && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }

  return parts.join('\n').trim();
}

function sanitizeModelText(text: string): string {
  return text
    .replace(/cite[^]+/g, '')
    .replace(/\[\^\d+\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
