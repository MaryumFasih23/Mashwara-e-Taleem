const axios = require("axios");

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_API_BASE = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/chat/completions";
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseCsv(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getGeminiModels() {
  return uniqueValues([
    ...parseCsv(process.env.GEMINI_MODELS),
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
  ]);
}

function getGroqModels() {
  return uniqueValues([
    ...parseCsv(process.env.GROQ_MODELS),
    process.env.GROQ_MODEL,
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
  ]);
}

function getHuggingFaceModels() {
  return uniqueValues([
    ...parseCsv(process.env.HUGGINGFACE_MODELS),
    process.env.HUGGINGFACE_MODEL,
    "meta-llama/Llama-3.1-8B-Instruct",
    "deepseek-ai/DeepSeek-R1:fastest",
  ]);
}

function getMaxRawResults() {
  const parsed = Number.parseInt(process.env.AI_MAX_RAW_RESULTS || "12", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

function shouldRetry(error) {
  const status = error.response?.status;

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT"
  );
}

function shouldTryNextModel(error) {
  const status = error.response?.status;
  return status === 400 || status === 404 || status === 422;
}

function getErrorDetail(error) {
  const responseData = error.response?.data;

  if (responseData?.error?.message) {
    return responseData.error.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  return error.message;
}

function normalizeGeminiModel(model) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function getPrompt(rawResults, country, domain, degreeLevel) {
  const rawText = rawResults
    .slice(0, getMaxRawResults())
    .map(
      (result, index) =>
        `[${index + 1}]\nTitle: ${result.title || ""}\nSnippet: ${
          result.snippet || result.description || ""
        }\nURL: ${result.link || result.url || result.source || ""}\nSource type: ${
          result.sourceType || "unknown"
        }`
    )
    .join("\n\n");

  return `
You are a data extraction system.

Your task is to extract REAL scholarships from raw search results and return structured data.

CRITICAL RULES:
1. Return ONLY valid JSON
2. Do NOT include markdown
3. Do NOT include explanation or text
4. Use double quotes ONLY
5. Ensure output is valid for JSON.parse()
6. If unsure about a value, write "Unknown"
7. DO NOT generate fake scholarships
8. Do NOT include Facebook, Reddit, forums, or discussion posts in this JSON array

Return ONLY valid JSON
Do NOT include markdown
Do NOT include explanations
Use double quotes ONLY
Ensure output can be parsed with JSON.parse

WHAT TO EXTRACT:
Only include REAL scholarships, not generic listing pages.

A valid scholarship:
- has a specific program name
- has an organization such as HEC, DAAD, Fulbright, Commonwealth, Chevening, Erasmus Mundus, a university, or a government agency
- has application or funding information
- can be Bachelor, Master, or Bachelor | Master
- should use the destination country, not the applicant nationality

User is looking for:
country: "${country}"
domain: "${domain}"
degreeLevel: "${degreeLevel}"

Use this exact JSON array format:
[
  {
    "title": "",
    "provider": "",
    "country": "",
    "domain": "",
    "degreeLevel": "",
    "amount": "",
    "deadline": "",
    "eligibility": [],
    "benefits": [],
    "applicationLink": "",
    "isGovernment": false,
    "type": "",
    "description": "",
    "source": "",
    "score": 0
  }
]

Raw search results:
${rawText}

FINAL INSTRUCTION:
Return ONLY the JSON array. Nothing else.
Stop after the closing bracket ].
`;
}

function parseProviderJson(text, providerName, model) {
  if (typeof text !== "string") {
    return { scholarships: [], provider: null, model: null };
  }

  try {
    const parsed = JSON.parse(text.trim());

    if (!Array.isArray(parsed)) {
      console.warn(`${providerName} ${model} returned JSON that was not an array.`);
      return { scholarships: [], provider: null, model: null };
    }

    console.log(`Structured scholarships with ${providerName} model ${model}.`);
    return { scholarships: parsed, provider: providerName, model };
  } catch (err) {
    console.error(`${providerName} ${model} JSON.parse failed:`, err.message);
    return { scholarships: [], provider: null, model: null };
  }
}

async function requestWithRetry(providerName, model, requestFn, errors) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestFn();
    } catch (err) {
      const status = err.response?.status;
      const message = status ? `status code ${status}` : err.message;
      const detail = getErrorDetail(err);

      if (attempt < MAX_ATTEMPTS && shouldRetry(err)) {
        console.warn(`${providerName} ${model} attempt ${attempt} failed with ${message}. Retrying.`);
        await sleep(attempt * 1000);
        continue;
      }

      console.error(`${providerName} ${model} unavailable after ${attempt} attempt(s): ${message}`);
      errors.push({
        provider: providerName,
        model,
        status: status || null,
        message,
        detail,
        retryable: shouldRetry(err),
      });
      return null;
    }
  }

  return null;
}

async function tryGemini(prompt, errors) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Gemini skipped because GEMINI_API_KEY is not configured.");
    return { scholarships: [], provider: null, model: null };
  }

  for (const model of getGeminiModels()) {
    const response = await requestWithRetry("Gemini", model, () =>
      axios.post(
        `${GEMINI_API_BASE}/${normalizeGeminiModel(model)}:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 5000,
            responseMimeType: "application/json",
          },
        },
        { timeout: 15000 }
      )
    , errors);

    if (!response) {
      continue;
    }

    const parsed = parseProviderJson(
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text,
      "Gemini",
      model
    );

    if (parsed.scholarships.length > 0) {
      return parsed;
    }
  }

  return { scholarships: [], provider: null, model: null };
}

async function tryGroq(prompt, errors) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn("Groq skipped because GROQ_API_KEY is not configured.");
    return { scholarships: [], provider: null, model: null };
  }

  for (const model of getGroqModels()) {
    const response = await requestWithRetry("Groq", model, () =>
      axios.post(
        GROQ_API_BASE,
        {
          model,
          messages: [
            {
              role: "system",
              content: "You convert raw scholarship text into JSON arrays only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0,
          max_tokens: 5000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      )
    , errors);

    if (!response) {
      const lastError = errors[errors.length - 1];
      if (lastError?.provider === "Groq" && lastError.status === 401) {
        break;
      }
      continue;
    }

    const parsed = parseProviderJson(response.data?.choices?.[0]?.message?.content, "Groq", model);

    if (parsed.scholarships.length > 0) {
      return parsed;
    }
  }

  return { scholarships: [], provider: null, model: null };
}

async function tryHuggingFace(prompt, errors) {
  const apiKey =
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HUGGINGFACE_HUB_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HF_API_KEY;
  const apiUrl = process.env.HUGGINGFACE_API_URL || DEFAULT_HUGGINGFACE_API_URL;

  if (!apiKey) {
    console.warn("Hugging Face skipped because HUGGINGFACE_API_KEY is not configured.");
    return { scholarships: [], provider: null, model: null };
  }

  for (const model of getHuggingFaceModels()) {
    const response = await requestWithRetry("Hugging Face", model, () =>
      axios.post(
        apiUrl,
        {
          model,
          messages: [
            {
              role: "system",
              content: "You convert raw scholarship text into JSON arrays only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0,
          max_tokens: 5000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      )
    , errors);

    if (!response) {
      const lastError = errors[errors.length - 1];
      if (lastError?.provider === "Hugging Face" && lastError.status === 401) {
        break;
      }

      if (lastError?.provider === "Hugging Face" && shouldTryNextModel({ response: { status: lastError.status } })) {
        continue;
      }

      continue;
    }

    const parsed = parseProviderJson(
      response.data?.choices?.[0]?.message?.content ||
        response.data?.generated_text,
      "Hugging Face",
      model
    );

    if (parsed.scholarships.length > 0) {
      return parsed;
    }
  }

  return { scholarships: [], provider: null, model: null };
}

async function parseScholarshipsWithAI(rawResults, country, domain, degreeLevel) {
  if (!Array.isArray(rawResults) || rawResults.length === 0) {
    return { scholarships: [], provider: null, model: null };
  }

  const prompt = getPrompt(rawResults, country, domain, degreeLevel);
  const providers = [tryGemini, tryGroq, tryHuggingFace];
  const errors = [];

  for (const provider of providers) {
    const result = await provider(prompt, errors);

    if (Array.isArray(result.scholarships) && result.scholarships.length > 0) {
      result.errors = errors;
      return result;
    }
  }

  return { scholarships: [], provider: null, model: null, errors };
}

module.exports = {
  buildGeminiPrompt: getPrompt,
  parseScholarshipsWithAI,
  parseWithGemini: parseScholarshipsWithAI,
};
