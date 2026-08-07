(function (global) {
  "use strict";

  const API_ENDPOINT = "/api/translate";

  const supportedLanguages = [
    "English", "Arabic", "Hausa", "French", "Spanish", "Portuguese",
    "German", "Italian", "Dutch", "Russian", "Ukrainian", "Polish",
    "Turkish", "Persian", "Urdu", "Hindi", "Bengali", "Punjabi",
    "Gujarati", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Nepali", "Sinhala", "Mandarin Chinese", "Cantonese", "Japanese",
    "Korean", "Vietnamese", "Thai", "Indonesian", "Malay",
    "Filipino (Tagalog)", "Swahili", "Somali", "Amharic", "Yoruba",
    "Igbo", "Zulu", "Afrikaans", "Hebrew", "Greek", "Romanian",
    "Czech", "Hungarian", "Swedish", "Norwegian", "Danish"
  ];

  let latestResults = null;

  function status(callback, message) {
    if (typeof callback === "function") callback(message);
  }

  function extractOutputText(data) {
    if (!Array.isArray(data && data.output)) return "";

    return data.output
      .flatMap(function (item) {
        return Array.isArray(item.content) ? item.content : [];
      })
      .filter(function (item) {
        return item.type === "output_text" && typeof item.text === "string";
      })
      .map(function (item) { return item.text; })
      .join("");
  }

  function cleanJSON(text) {
    return String(text || "")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  async function callAPI(prompt, options) {
    const settings = options || {};
    const response = await fetch(settings.apiEndpoint || API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
      signal: settings.signal
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("The server returned invalid JSON.");
    }

    if (!response.ok) {
      throw new Error(
        (data && data.error && data.error.message) ||
        (data && data.error) ||
        "The API request failed."
      );
    }

    const output = cleanJSON(extractOutputText(data));
    if (!output) throw new Error("The API returned no text.");

    try {
      return JSON.parse(output);
    } catch (error) {
      console.error("Invalid AI JSON:", output);
      throw new Error("The AI response was not valid JSON.");
    }
  }

  function buildPrompt(text, sourceLanguage, targetLanguage) {
    return `
You are a multilingual translation and pronunciation alignment engine.

SUPPORTED LANGUAGES:
${supportedLanguages.join(", ")}

SOURCE LANGUAGE SETTING:
${sourceLanguage}

TARGET LANGUAGE:
${targetLanguage}

USER TEXT:
${text}

TASK:
1. Detect the actual source language.
2. Translate the complete source naturally into ${targetLanguage}.
3. Divide the source and target into matching meaningful phrases.
4. Give every target phrase an easy Latin-letter pronunciation.
5. Return each source phrase, translation, and pronunciation together.

RULES:
- Preserve the complete meaning, names, numbers, pronouns, articles and conjunctions.
- Use natural phrase groups, not individual letters or characters.
- Do not create a word-by-word dictionary.
- Do not duplicate source meanings or translated words.
- Every source phrase must match its translation phrase.
- Every pronunciation must pronounce only its matching translation.
- Keep the source phrases in their original order.
- Use approximately 2 to 8 groups depending on sentence length.
- A short sentence may use one group.
- Use Latin letters for pronunciation and do not use IPA.
- Do not explain anything.
- Do not use Markdown.
- Return valid JSON only.

OUTPUT EXACTLY:
{
  "detected_language": "",
  "target_language": "",
  "groups": [
    {
      "index": 0,
      "source": "",
      "translation": "",
      "pronunciation": ""
    }
  ]
}
`;
  }

  function normalizeGroups(groups) {
    if (!Array.isArray(groups)) return [];

    return groups
      .map(function (group, index) {
        return {
          index: index,
          source: String(group && group.source || "").trim(),
          translation: String(group && group.translation || "").trim(),
          pronunciation: String(group && group.pronunciation || "").trim()
        };
      })
      .filter(function (group) {
        return group.source && group.translation && group.pronunciation;
      });
  }

  async function generateResults(options) {
    const settings = options || {};
    const text = String(settings.text || "").trim();
    const sourceLanguage = settings.sourceLanguage || "Auto Detect";
    const targetLanguage = settings.targetLanguage || "English";

    if (!text) throw new Error("Enter some text.");
    if (sourceLanguage !== "Auto Detect" && sourceLanguage === targetLanguage) {
      throw new Error("The source and target languages must be different.");
    }

    status(settings.onStatus, "Translating and connecting meanings...");

    const response = await callAPI(
      buildPrompt(text, sourceLanguage, targetLanguage),
      settings
    );

    const groups = normalizeGroups(response.groups);
    if (!groups.length) {
      throw new Error("No connected translation groups were returned.");
    }

    latestResults = {
      request: { text, sourceLanguage, targetLanguage },
      detectedLanguage: response.detected_language || sourceLanguage,
      targetLanguage: response.target_language || targetLanguage,
      groups: groups,
      generatedAt: new Date().toISOString()
    };

    global.lingoResults = latestResults;
    status(settings.onStatus, "Complete.");
    return latestResults;
  }

  global.lingoResults = null;
  global.LingoGPTResults = Object.freeze({
    supportedLanguages: Object.freeze(supportedLanguages.slice()),
    generateResults: generateResults,
    getLatestResults: function () { return latestResults; }
  });
})(window);
