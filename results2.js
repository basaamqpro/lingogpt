(function (global) {
  "use strict";

  const API_ENDPOINT = "/api/translate";

  const supportedLanguages = [
    "English",
    "Arabic",
    "Hausa",
    "French",
    "Spanish",
    "Portuguese",
    "German",
    "Italian",
    "Dutch",
    "Russian",
    "Ukrainian",
    "Polish",
    "Turkish",
    "Persian",
    "Urdu",
    "Hindi",
    "Bengali",
    "Punjabi",
    "Gujarati",
    "Marathi",
    "Tamil",
    "Telugu",
    "Kannada",
    "Malayalam",
    "Nepali",
    "Sinhala",
    "Mandarin Chinese",
    "Cantonese",
    "Japanese",
    "Korean",
    "Vietnamese",
    "Thai",
    "Indonesian",
    "Malay",
    "Filipino (Tagalog)",
    "Swahili",
    "Somali",
    "Amharic",
    "Yoruba",
    "Igbo",
    "Zulu",
    "Afrikaans",
    "Hebrew",
    "Greek",
    "Romanian",
    "Czech",
    "Hungarian",
    "Swedish",
    "Norwegian",
    "Danish"
  ];

  let latestResults = null;

  function updateStatus(callback, message) {
    if (typeof callback === "function") {
      callback(message);
    }
  }

  function extractOutputText(data) {
    if (!Array.isArray(data?.output)) {
      return "";
    }

    return data.output
      .flatMap(function (outputItem) {
        return Array.isArray(outputItem.content)
          ? outputItem.content
          : [];
      })
      .filter(function (contentItem) {
        return (
          contentItem.type === "output_text" &&
          typeof contentItem.text === "string"
        );
      })
      .map(function (contentItem) {
        return contentItem.text;
      })
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

    const response = await fetch(
      settings.apiEndpoint || API_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          prompt: prompt
        }),

        signal: settings.signal
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        "The server returned invalid JSON."
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.error ||
        "The API request failed.";

      throw new Error(
        typeof errorMessage === "string"
          ? errorMessage
          : "The API request failed."
      );
    }

    const outputText = cleanJSON(
      extractOutputText(data)
    );

    if (!outputText) {
      throw new Error(
        "The API returned no text."
      );
    }

    try {
      return JSON.parse(outputText);
    } catch (error) {
      console.error(
        "Invalid AI JSON:",
        outputText
      );

      throw new Error(
        "The AI response was not valid JSON."
      );
    }
  }

  function buildPrompt(
    text,
    sourceLanguage,
    targetLanguage
  ) {
    const sourceInstruction =
      sourceLanguage === "Auto Detect"
        ? `
Detect the actual source language automatically.
`
        : `
The expected source language is ${sourceLanguage}.
Verify that the text is actually written in this language.
`;

    return `
You are a multilingual translation and pronunciation alignment engine.

SUPPORTED LANGUAGES:

${supportedLanguages.join(", ")}

SOURCE LANGUAGE SETTING:

${sourceLanguage}

TARGET LANGUAGE:

${targetLanguage}

${sourceInstruction}

USER TEXT:

${text}

TASK:

1. Detect the actual source language.

2. Translate the complete source text naturally into
${targetLanguage}.

3. Divide the source sentence and target translation into matching
meaningful phrases.

4. Give every target phrase an easy Latin-letter natural
pronunciation.

5. Return the source phrase, matching translation and matching
pronunciation together in one group.

EXAMPLE:

Source text:

Today I went to the store and bought bread and milk.
I also ate the bread.

Possible correct groups:

{
  "detected_language": "English",
  "target_language": "Japanese",
  "groups": [
    {
      "index": 0,
      "source": "Today",
      "translation": "今日は",
      "pronunciation": "Kyoh wah"
    },
    {
      "index": 1,
      "source": "I went to the store",
      "translation": "店に行って",
      "pronunciation": "Mee-seh nee ee-teh"
    },
    {
      "index": 2,
      "source": "and bought bread and milk",
      "translation": "パンと牛乳を買いました",
      "pronunciation": "Pahn toh gyoo-nyoo oh kah-ee-mah-shee-tah"
    },
    {
      "index": 3,
      "source": "I also ate the bread",
      "translation": "パンも食べました",
      "pronunciation": "Pahn moh tah-beh-mah-shee-tah"
    }
  ]
}

GROUPING RULES:

- Use natural meaningful phrases.
- Do not divide words into individual letters or characters.
- Do not divide Japanese words into separate kanji or kana pieces.
- Do not create one row for every target word.
- Do not create a word-by-word dictionary.
- Do not duplicate source meanings unnecessarily.
- Do not duplicate translation words unnecessarily.
- Preserve the complete source meaning.
- Preserve the natural target-language word order.
- Every source phrase must match its translation phrase.
- Every pronunciation must pronounce only its matching translation.
- Keep the source phrases in their original order.
- Keep the translation phrases in their natural order.
- Use approximately 2 to 8 groups depending on the sentence length.
- A short sentence may contain only one group.
- Longer sentences may contain more groups.

PRONUNCIATION RULES:

- Use Latin letters.
- Make the pronunciation easy for an English-speaking learner.
- Do not use IPA.
- Pronounce the complete target phrase.
- Do not translate inside the pronunciation.
- Do not include explanations.
- Do not include pronunciation notes.
- Do not use quotation marks around pronunciation values.

GENERAL RULES:

- Return only the requested information.
- Do not return the full source sentence separately.
- Do not return the complete translation separately.
- Do not return transliteration sections.
- Do not return a dictionary.
- Do not use Markdown.
- Return valid JSON only.
- Every group must contain source, translation and pronunciation.
- Index must start from 0 and increase by 1.

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
    if (!Array.isArray(groups)) {
      return [];
    }

    return groups
      .map(function (group, index) {
        return {
          index: Number.isInteger(
            Number(group?.index)
          )
            ? Number(group.index)
            : index,

          source: String(
            group?.source || ""
          ).trim(),

          translation: String(
            group?.translation || ""
          ).trim(),

          pronunciation: String(
            group?.pronunciation || ""
          ).trim()
        };
      })
      .filter(function (group) {
        return (
          group.source &&
          group.translation &&
          group.pronunciation
        );
      })
      .map(function (group, index) {
        return {
          index: index,
          source: group.source,
          translation: group.translation,
          pronunciation: group.pronunciation
        };
      });
  }

  async function generateResults(options) {
    const settings = options || {};

    const text = String(
      settings.text || ""
    ).trim();

    const sourceLanguage =
      settings.sourceLanguage ||
      "Auto Detect";

    const targetLanguage =
      settings.targetLanguage ||
      "English";

    if (!text) {
      throw new Error(
        "Enter some text."
      );
    }

    if (
      sourceLanguage !== "Auto Detect" &&
      sourceLanguage === targetLanguage
    ) {
      throw new Error(
        "The source and target languages must be different."
      );
    }

    updateStatus(
      settings.onStatus,
      "Translating and connecting meanings..."
    );

    const response = await callAPI(
      buildPrompt(
        text,
        sourceLanguage,
        targetLanguage
      ),
      settings
    );

    const groups = normalizeGroups(
      response.groups
    );

    if (!groups.length) {
      throw new Error(
        "No connected translation groups were returned."
      );
    }

    latestResults = {
      request: {
        text: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      },

      detectedLanguage:
        response.detected_language ||
        sourceLanguage,

      targetLanguage:
        response.target_language ||
        targetLanguage,

      groups: groups,

      generatedAt:
        new Date().toISOString()
    };

    global.lingoResults =
      latestResults;

    updateStatus(
      settings.onStatus,
      "Complete."
    );

    return latestResults;
  }

  function getLatestResults() {
    return latestResults;
  }

  global.lingoResults = null;

  global.LingoGPTResults =
    Object.freeze({
      supportedLanguages:
        Object.freeze(
          supportedLanguages.slice()
        ),

      generateResults:
        generateResults,

      getLatestResults:
        getLatestResults
    });

})(window);