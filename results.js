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

  const languageLocales = {
    English: "en",
    Arabic: "ar",
    Hausa: "ha",
    French: "fr",
    Spanish: "es",
    Portuguese: "pt",
    German: "de",
    Italian: "it",
    Dutch: "nl",
    Russian: "ru",
    Ukrainian: "uk",
    Polish: "pl",
    Turkish: "tr",
    Persian: "fa",
    Urdu: "ur",
    Hindi: "hi",
    Bengali: "bn",
    Punjabi: "pa",
    Gujarati: "gu",
    Marathi: "mr",
    Tamil: "ta",
    Telugu: "te",
    Kannada: "kn",
    Malayalam: "ml",
    Nepali: "ne",
    Sinhala: "si",
    "Mandarin Chinese": "zh",
    Cantonese: "yue",
    Japanese: "ja",
    Korean: "ko",
    Vietnamese: "vi",
    Thai: "th",
    Indonesian: "id",
    Malay: "ms",
    "Filipino (Tagalog)": "fil",
    Swahili: "sw",
    Somali: "so",
    Amharic: "am",
    Yoruba: "yo",
    Igbo: "ig",
    Zulu: "zu",
    Afrikaans: "af",
    Hebrew: "he",
    Greek: "el",
    Romanian: "ro",
    Czech: "cs",
    Hungarian: "hu",
    Swedish: "sv",
    Norwegian: "no",
    Danish: "da"
  };

  let latestResults = null;

  function status(callback, message) {
    if (typeof callback === "function") {
      callback(message);
    }
  }

  function extractOutputText(data) {
    if (!Array.isArray(data && data.output)) {
      return "";
    }

    return data.output
      .flatMap(function (item) {
        return Array.isArray(item.content)
          ? item.content
          : [];
      })
      .filter(function (item) {
        return (
          item.type === "output_text" &&
          typeof item.text === "string"
        );
      })
      .map(function (item) {
        return item.text;
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
      throw new Error(
        (
          data &&
          data.error &&
          data.error.message
        ) ||
        (
          data &&
          data.error
        ) ||
        "The API request failed."
      );
    }

    const output = cleanJSON(
      extractOutputText(data)
    );

    if (!output) {
      throw new Error(
        "The API returned no text."
      );
    }

    try {
      return JSON.parse(output);
    } catch (error) {
      console.error(
        "Invalid AI JSON:",
        output
      );

      throw new Error(
        "The AI response was not valid JSON."
      );
    }
  }

  function getDictionaryWords(
    text,
    language
  ) {
    const value =
      String(text || "").trim();

    if (!value) {
      return [];
    }

    const locale =
      languageLocales[language] || "en";

    if (
      typeof Intl !== "undefined" &&
      typeof Intl.Segmenter === "function"
    ) {
      try {
        const segmenter =
          new Intl.Segmenter(
            locale,
            {
              granularity: "word"
            }
          );

        return Array.from(
          segmenter.segment(value)
        )
          .filter(function (item) {
            return item.isWordLike;
          })
          .map(function (item) {
            return item.segment.trim();
          })
          .filter(Boolean);

      } catch (error) {
        console.warn(
          "Intl.Segmenter failed:",
          error
        );
      }
    }

    return value
      .replace(
        /[.,!?;:،。！？"“”‘’()[\]{}]/g,
        " "
      )
      .split(/\s+/)
      .filter(Boolean);
  }

  function normalizeWord(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(
        /[.,!?;:،。！？"“”‘’()[\]{}]/g,
        ""
      )
      .trim()
      .toLocaleLowerCase();
  }

  function dictionaryIsValid(
    pairs,
    words
  ) {
    return (
      Array.isArray(pairs) &&
      pairs.length === words.length &&
      words.every(function (word, index) {
        return (
          normalizeWord(
            pairs[index] &&
            pairs[index].target_words
          ) ===
          normalizeWord(word)
        );
      })
    );
  }

  function step1Prompt(
    text,
    sourceLanguage,
    targetLanguage
  ) {
    return `
You are a multilingual translation engine.

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

2. If the source is romanized or transliterated, restore its correct
native script.

3. Translate the complete meaning naturally into ${targetLanguage}.

4. Provide a Latin transliteration of the normalized source.

5. Provide a Latin transliteration of the target translation.

6. Provide an easy English-readable natural pronunciation of the
target translation.

DEFINITIONS:

detected_language:
The actual source language.

script_version:
The source input written in its correct native writing system.

input_transliteration:
The complete source sentence written with Latin letters.

translation:
The natural ${targetLanguage} translation.

output_transliteration:
The complete target translation written with Latin letters.

natural_pronunciation:
An easy pronunciation guide for the complete target translation.

RULES:

- Preserve the complete meaning.
- Preserve names, numbers and pronouns.
- Use the normal writing system of the target language.
- Do not explain anything.
- Do not use Markdown.
- Return valid JSON only.
- Every property must contain a string.

OUTPUT EXACTLY:

{
  "detected_language": "",
  "script_version": "",
  "input_transliteration": "",
  "translation": "",
  "output_transliteration": "",
  "natural_pronunciation": ""
}
`;
  }

  function step2Prompt(
    step1,
    targetLanguage
  ) {
    return `
You are a multilingual semantic alignment engine.

SOURCE LANGUAGE:

${step1.detected_language}

TARGET LANGUAGE:

${targetLanguage}

SOURCE:

${step1.script_version}

SOURCE TRANSLITERATION:

${step1.input_transliteration}

TRANSLATION:

${step1.translation}

OUTPUT TRANSLITERATION:

${step1.output_transliteration}

NATURAL PRONUNCIATION:

${step1.natural_pronunciation}

TASK:

Divide all five versions into meaningful words or short phrases.

Give corresponding meanings the same integer index.

The source, translation and natural pronunciation must share the same
index when they express the same meaning.

EXAMPLE:

Source:

Today I bought an apple and bread

Target:

اليوم اشتريت تفاحة وخبزاً

Pronunciation:

al-yawm ishtaraytu tuffahatan wa khubzan

Semantic groups:

Today
اليوم
al-yawm

I bought
اشتريت
ishtaraytu

an apple
تفاحة
tuffahatan

and bread
وخبزاً
wa khubzan

RULES:

- Same meaning must use the same index.
- Different meanings must use different indexes.
- Word order may differ.
- One word may correspond to several words.
- Several words may correspond to one word.
- Preserve every meaningful part.
- Keep natural connected phrases together.
- Do not explain anything.
- Do not use Markdown.
- Return valid JSON only.
- Each item must contain word and index.
- Index must be an integer starting from 0.

OUTPUT EXACTLY:

{
  "input": [
    {
      "word": "",
      "index": 0
    }
  ],

  "input_transliteration": [
    {
      "word": "",
      "index": 0
    }
  ],

  "translation": [
    {
      "word": "",
      "index": 0
    }
  ],

  "output_transliteration": [
    {
      "word": "",
      "index": 0
    }
  ],

  "natural_pronunciation": [
    {
      "word": "",
      "index": 0
    }
  ]
}
`;
  }

  function dictionaryPrompt(
    text,
    step1,
    targetLanguage,
    words,
    previousPairs
  ) {
    const correction =
      Array.isArray(previousPairs)
        ? `
PREVIOUS INVALID PAIRS:

${JSON.stringify(previousPairs)}

Correct the previous pairs.
`
        : "";

    return `
You are creating a strict word-by-word pronunciation dictionary.

SOURCE LANGUAGE:

${step1.detected_language}

TARGET LANGUAGE:

${targetLanguage}

ORIGINAL SOURCE:

${text}

SOURCE SCRIPT:

${step1.script_version}

SOURCE TRANSLITERATION:

${step1.input_transliteration}

TARGET TRANSLATION:

${step1.translation}

TARGET TRANSLITERATION:

${step1.output_transliteration}

TARGET NATURAL PRONUNCIATION:

${step1.natural_pronunciation}

EXACT ORDERED TARGET WORDS:

${JSON.stringify(words)}

REQUIRED ROW COUNT:

${words.length}

${correction}

TASK:

Return exactly one row for each target-language word.

For each row return:

target_pronunciation:
The pronunciation of only that one target word.

target_words:
The exact target word at that position.

source_words:
The smallest matching source-language word or natural phrase.

source_pronunciation:
The Latin pronunciation of source_words.

When the source language is English, source_pronunciation must be an
empty string.

STRICT RULES:

- Keep the exact target-word order.
- Do not combine target words.
- Do not omit target words.
- Do not change the target spelling.
- Do not add punctuation to target_words.
- The pairs array must contain exactly ${words.length} rows.
- Every target_words value must match the supplied target word at the
same array position.
- A source word may be repeated when several target words express one
source meaning.
- Do not leave source_words empty.
- Do not use IPA.
- Do not explain anything.
- Do not use Markdown.
- Return valid JSON only.

OUTPUT EXACTLY:

{
  "pairs": [
    {
      "target_pronunciation": "",
      "target_words": "",
      "source_words": "",
      "source_pronunciation": ""
    }
  ]
}
`;
  }

  async function createDictionary(
    config
  ) {
    status(
      config.onStatus,
      "Creating word-by-word dictionary..."
    );

    const first = await callAPI(
      dictionaryPrompt(
        config.text,
        config.step1,
        config.targetLanguage,
        config.words
      ),
      config
    );

    if (
      dictionaryIsValid(
        first.pairs,
        config.words
      )
    ) {
      first.corrected = false;
      first.valid = true;

      return first;
    }

    console.warn(
      "The first dictionary was invalid:",
      first.pairs
    );

    status(
      config.onStatus,
      "Correcting word-by-word dictionary..."
    );

    const corrected = await callAPI(
      dictionaryPrompt(
        config.text,
        config.step1,
        config.targetLanguage,
        config.words,
        first.pairs || []
      ),
      config
    );

    corrected.corrected = true;

    corrected.valid =
      dictionaryIsValid(
        corrected.pairs,
        config.words
      );

    return corrected;
  }

  async function generateResults(
    options
  ) {
    const settings =
      options || {};

    const text =
      String(
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

    status(
      settings.onStatus,
      "Detecting and translating..."
    );

    const step1 = await callAPI(
      step1Prompt(
        text,
        sourceLanguage,
        targetLanguage
      ),
      settings
    );

    if (
      !step1 ||
      !String(
        step1.translation || ""
      ).trim()
    ) {
      throw new Error(
        "The translation result was incomplete."
      );
    }

    status(
      settings.onStatus,
      "Creating semantic alignment..."
    );

    const step2 = await callAPI(
      step2Prompt(
        step1,
        targetLanguage
      ),
      settings
    );

    const targetDictionaryWords =
      getDictionaryWords(
        step1.translation,
        targetLanguage
      );

    if (
      !targetDictionaryWords.length
    ) {
      throw new Error(
        "No target-language words were found."
      );
    }

    const step3 =
      await createDictionary({
        text: text,

        step1: step1,

        targetLanguage:
          targetLanguage,

        words:
          targetDictionaryWords,

        apiEndpoint:
          settings.apiEndpoint,

        signal:
          settings.signal,

        onStatus:
          settings.onStatus
      });

    latestResults = {
      request: {
        text: text,

        sourceLanguage:
          sourceLanguage,

        targetLanguage:
          targetLanguage
      },

      detectedLanguage:
        step1.detected_language ||
        sourceLanguage,

      targetDictionaryWords:
        targetDictionaryWords,

      step1:
        step1,

      step2:
        step2,

      step3:
        step3,

      generatedAt:
        new Date().toISOString()
    };

    global.lingoResults =
      latestResults;

    status(
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

      languageLocales:
        Object.freeze(
          Object.assign(
            {},
            languageLocales
          )
        ),

      generateResults:
        generateResults,

      getLatestResults:
        getLatestResults,

      getDictionaryWords:
        getDictionaryWords
    });

})(window);