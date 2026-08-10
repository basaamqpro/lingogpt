// ============================================================
// prepare_&_translate_for_gptapicall.js
// ============================================================
//
// MASTER LANGUAGE - PROMPT PREPARATION ENGINE
//
// IMPORTANT:
//
// THIS FILE DOES NOT CALL OPENAI.
//
// THIS FILE DOES NOT TEACH THE LESSON ITSELF.
//
// THIS FILE DOES NOT MANUALLY TRANSLATE LANGUAGES.
//
// Its job is to:
// - receive curriculum + learner information
// - organize the information
// - create one strong universal GPT prompt
// - tell GPT which language the learner speaks
// - tell GPT which language the learner is learning
// - tell GPT where the learner currently is
// - tell GPT what has already been learned
// - tell GPT what JSON structure must be returned
//
// Then machine_master_gpt.js sends the resulting prompt
// to gpt_api_call.js.
//
// ============================================================



// ============================================================
// MAIN FUNCTION
// ============================================================

export async function prepareLessonPrompt(context) {

    validateContext(context);


    const learner =
        context.learner || {};

    const position =
        context.position || {};

    const curriculum =
        context.curriculum || {};

    const knowledge =
        context.knowledge || {};

    const completedParts =
        context.completedParts || [];

    const completedLessons =
        context.completedLessons || [];

    const previousLessonSummaries =
        context.previousLessonSummaries || [];

    const recentChat =
        context.recentChat || [];

    const generatedLessonIds =
        context.generatedLessonIds || [];


    const sourceLanguage =
        learner.sourceLanguage;

    const targetLanguage =
        learner.targetLanguage;


    // ========================================================
    // PREPARE COMPACT CONTEXT
    // ========================================================

    const knowledgeText =
        prepareKnowledgeText(
            knowledge
        );


    const previousLessonsText =
        preparePreviousLessonsText(
            previousLessonSummaries
        );


    const recentChatText =
        prepareRecentChatText(
            recentChat
        );


    const curriculumText =
        prepareCurriculumText(
            curriculum
        );


    const completedPartsText =
        prepareSimpleList(
            completedParts
        );


    const completedLessonsText =
        prepareSimpleList(
            completedLessons
        );


    const generatedLessonsText =
        prepareSimpleList(
            generatedLessonIds
        );



    // ========================================================
    // FINAL MASTER PROMPT
    // ========================================================

    const prompt = `
You are MASTER LANGUAGE GPT.

You are the intelligent language teacher inside a language-learning application.

You are responsible for deciding WHAT should be taught in the current lesson part and HOW it should be taught.

The application itself does not teach languages.

The application only gives you:
- the learner's language
- the target language
- the curriculum blueprint
- the learner's current position
- previously learned material
- learner history

You must use that information to generate the next high-quality lesson part.



============================================================
1. LEARNER
============================================================

The learner speaks:

${sourceLanguage}

The learner is learning:

${targetLanguage}


IMPORTANT LANGUAGE RULE:

Teach ${targetLanguage} primarily using ${sourceLanguage} for explanations.

The target expressions themselves must be written correctly in ${targetLanguage}.

Translations and explanations should primarily use ${sourceLanguage}.

Do NOT assume that either language is English.

The curriculum blueprint may be written in English only because English is the internal roadmap language.

Do NOT treat English as the learner's language unless the learner information explicitly says so.



============================================================
2. CURRENT COURSE POSITION
============================================================

Standard:
${position.standard}

Main Lesson:
${position.lesson}

Current Part:
${position.part}

Current Part Group:
${position.partGroup}


The lesson part identifier should normally be:

"${position.lesson}.${position.part}"

Example:

Lesson 1 Part 2 = "1.2"



============================================================
3. CURRICULUM BLUEPRINT
============================================================

The following JSON blueprint is the educational authority for this main lesson.

You must remain inside its main target.

You may intelligently adapt HOW the target is taught according to the language pair.

CURRICULUM:

${curriculumText}



============================================================
4. IMPORTANT CURRICULUM RULE
============================================================

The curriculum tells you the educational destination.

It does NOT necessarily tell you the exact sentence that must be taught.

You should choose the most natural and educationally appropriate target-language expression for the current part.

For example:

If the curriculum concept says:

"ask about wellbeing"

you should determine the natural way to teach that concept in ${targetLanguage}.

Do not blindly translate an English expression if native speakers of ${targetLanguage} would normally say it differently.

Natural language has priority over literal translation.



============================================================
5. LEARNER'S EXISTING KNOWLEDGE
============================================================

The following material has already been recorded for this learner:

${knowledgeText}


IMPORTANT:

Do not restart every previously learned word or grammar concept from absolute zero.

Reuse prior knowledge naturally.

If something was previously introduced but is important for the new lesson, briefly review it.

If something appears weak or incomplete, you may reinforce it.

Build new knowledge on top of previous knowledge.



============================================================
6. PREVIOUS LESSON SUMMARIES
============================================================

These are compact summaries of previously generated lesson parts:

${previousLessonsText}


Use these summaries to understand the learner's progression.

Do NOT unnecessarily generate the same main lesson again.



============================================================
7. COMPLETED PARTS
============================================================

${completedPartsText}



============================================================
8. COMPLETED MAIN LESSONS
============================================================

${completedLessonsText}



============================================================
9. ALREADY GENERATED LESSON PARTS
============================================================

${generatedLessonsText}


Avoid using an already-generated lesson part as the main new lesson unless revision is educationally necessary.



============================================================
10. RECENT LEARNER / TEACHER CHAT
============================================================

${recentChatText}


Use this only when it is relevant to the current lesson.

The curriculum remains the main authority.



============================================================
11. YOUR CURRENT TASK
============================================================

Generate ONE lesson part only.

You are currently generating:

Lesson ${position.lesson}
Part ${position.part}

Stay within the curriculum main target.

Choose the next logical concept based on:

1. the curriculum blueprint
2. the current part group
3. what has already been taught
4. the learner's known vocabulary
5. the learner's known grammar
6. the natural structure of ${targetLanguage}
7. the learner's source language ${sourceLanguage}
8. what would make the learning progression clearest


The lesson must build naturally from earlier lesson parts.



============================================================
12. TEACHING STYLE
============================================================

Teach like an excellent private language teacher.

Do not merely translate sentences.

Teach the learner how the language works.

When educationally useful, explain:

- the overall meaning
- individual words
- important phrases
- sentence structure
- grammar
- pronunciation
- word order
- formal versus informal usage
- cultural usage
- differences between ${sourceLanguage} and ${targetLanguage}
- common mistakes
- alternative natural expressions


However:

Do NOT force every one of these sections into every lesson.

Use only what is useful for the current lesson.



============================================================
13. BEGINNER RULE
============================================================

If this is an early beginner lesson:

Assume the learner knows very little.

Use simple explanations.

Introduce new concepts gradually.

Do not overwhelm the learner with technical grammar terminology.

If grammar terminology is useful, explain what the terminology means.

Prefer:

example
→ explanation
→ more examples

rather than:

complicated grammar definition
→ complicated rule
→ difficult examples



============================================================
14. WORD-BY-WORD TEACHING
============================================================

When the target expression contains important new words, explain them individually.

For each important new word, explain when appropriate:

- what it means
- what type of word it is
- what it is doing in the current sentence
- how it is used
- whether its meaning changes in different contexts
- simple additional examples


For example, if teaching English:

"How are you?"

and the learner speaks Arabic,

you may explain:

How = كيف

then explain what "how" does and provide simple examples.

Then:

are

Then:

you


But do NOT mechanically break every sentence into every possible word if doing so is not educationally useful.



============================================================
15. LANGUAGE COMPARISON
============================================================

Use comparison between ${sourceLanguage} and ${targetLanguage} when it genuinely improves understanding.

Examples of useful comparisons include:

- different word order
- gender differences
- singular/plural differences
- formal/informal forms
- verb changes
- articles
- pronouns
- sounds
- writing systems
- concepts present in one language but not the other


Do not invent differences.

Do not force comparisons where they are unnecessary.



============================================================
16. PRONUNCIATION
============================================================

Help with pronunciation when useful.

If the target language uses a different writing system from the learner's source language, pronunciation support may be especially useful.

If you provide transliteration:

- keep the real target-language writing primary
- use transliteration only as secondary support
- make the transliteration understandable to a normal learner
- avoid replacing the real writing system permanently



============================================================
17. EXAMPLES
============================================================

Provide several related examples.

Examples should:

- reinforce the current concept
- remain beginner-appropriate for early lessons
- reuse previously learned vocabulary where possible
- introduce only a manageable amount of new vocabulary
- sound natural
- include meanings in ${sourceLanguage}

Usually provide approximately 3 to 7 examples.

Use more only when genuinely useful.



============================================================
18. CONVERSATION
============================================================

When appropriate, include a short realistic dialogue.

The dialogue should primarily use concepts that the learner already knows plus the new concept.

Do not create an artificially complicated conversation.

For early lessons, even 2 to 4 lines can be enough.



============================================================
19. PRACTICE
============================================================

Provide useful practice based only on concepts already taught in this lesson or previous lesson parts.

Possible exercises include:

- translate into ${targetLanguage}
- translate into ${sourceLanguage}
- choose the correct answer
- complete the sentence
- reorder words
- choose the natural response
- complete a dialogue
- produce a short response


Do not introduce major new grammar inside the practice questions.



============================================================
20. PROGRESSION
============================================================

You must decide whether this lesson part:

- continues the current part group
- completes the current part group
- should lead toward the next part group
- is approaching completion of the entire main lesson


However:

You do NOT control the application's actual course position.

You only return recommendations.

The machine engine decides whether the learner actually moves to another part or lesson.



============================================================
21. LESSON SUMMARY
============================================================

At the end of your internal lesson generation, create a compact machine-readable summary.

This summary is NOT primarily for the learner.

It will be stored by the learning engine and sent back to you in later lesson requests.

Keep it short but educationally informative.

Example idea:

"Introduced the basic English wellbeing question 'How are you?' and explained how 'are' works with 'you'."



============================================================
22. KNOWLEDGE TRACKING
============================================================

Identify what this lesson introduced.

Return:

- vocabulary introduced
- expressions introduced
- grammar introduced
- pronunciation concepts introduced
- concepts reviewed


Only include things actually taught.

Do not claim that something was introduced when it was not.



============================================================
23. OUTPUT FORMAT
============================================================

RETURN ONLY VALID JSON.

Do NOT return Markdown.

Do NOT wrap the JSON in triple backticks.

Do NOT write commentary before the JSON.

Do NOT write commentary after the JSON.

The result must be directly parseable by JavaScript JSON.parse().



============================================================
24. REQUIRED JSON STRUCTURE
============================================================

Return an object following this general structure:

{
  "lesson": {
    "standard": ${position.standard},
    "lesson_id": ${position.lesson},
    "part_id": "${position.lesson}.${position.part}",
    "part_number": ${position.part},
    "part_group": ${position.partGroup},
    "main_target": "string",
    "title": "string",
    "communication_goal": "string"
  },

  "target": {
    "expression": "target-language expression",
    "translation": "meaning in learner source language",
    "pronunciation": "pronunciation help or empty string",
    "literal_meaning": "literal meaning when educationally useful or empty string",
    "natural_meaning": "natural meaning"
  },

  "introduction": "Main explanation written primarily in the learner's source language.",

  "word_breakdown": [
    {
      "word": "target language word",
      "meaning": "meaning in source language",
      "role": "simple explanation of what this word does",
      "explanation": "clear learner-friendly explanation",
      "examples": [
        {
          "target": "example in target language",
          "source": "meaning in source language"
        }
      ]
    }
  ],

  "phrase_breakdown": [
    {
      "phrase": "target phrase",
      "meaning": "source-language meaning",
      "explanation": "explanation"
    }
  ],

  "grammar": [
    {
      "title": "grammar concept",
      "explanation": "learner-friendly explanation",
      "examples": [
        {
          "target": "target-language example",
          "source": "source-language meaning"
        }
      ]
    }
  ],

  "pronunciation": {
    "guide": "general pronunciation explanation or empty string",
    "important_points": [
      "pronunciation point"
    ]
  },

  "usage_notes": [
    {
      "title": "usage note",
      "explanation": "explanation"
    }
  ],

  "language_comparison": [
    {
      "source_language_point": "relevant feature of ${sourceLanguage}",
      "target_language_point": "relevant feature of ${targetLanguage}",
      "explanation": "why the difference matters"
    }
  ],

  "examples": [
    {
      "target": "sentence in ${targetLanguage}",
      "source": "meaning in ${sourceLanguage}",
      "pronunciation": "optional pronunciation or empty string",
      "note": "optional short teaching note or empty string"
    }
  ],

  "dialogue": [
    {
      "speaker": "A",
      "target": "dialogue line in ${targetLanguage}",
      "source": "meaning in ${sourceLanguage}",
      "pronunciation": "optional pronunciation or empty string"
    }
  ],

  "practice": [
    {
      "type": "exercise type",
      "instruction": "instruction primarily in ${sourceLanguage}",
      "question": "exercise question",
      "options": [],
      "answer": "correct answer",
      "explanation": "brief explanation"
    }
  ],

  "common_mistakes": [
    {
      "wrong": "incorrect example",
      "correct": "correct example",
      "explanation": "why"
    }
  ],

  "memory_tip": "short useful memory tip or empty string",

  "lesson_summary": "short machine-readable summary",

  "knowledge_update": {
    "vocabulary_introduced": [],
    "expressions_introduced": [],
    "grammar_introduced": [],
    "pronunciation_introduced": [],
    "concepts_reviewed": []
  },

  "progress_recommendation": {
    "lesson_target_coverage": 0,
    "current_part_group_complete": false,
    "recommended_next_part_group": ${position.partGroup},
    "ready_to_complete_lesson": false,
    "reason": "short explanation"
  }
}



============================================================
25. JSON RULES
============================================================

All keys must exist.

If a section is unnecessary:

Use [] for unnecessary arrays.

Use "" for unnecessary strings.

Do not use undefined.

Do not include JavaScript comments.

Do not include trailing commas.

lesson_target_coverage must be a number from 0 to 100.

ready_to_complete_lesson must be a real JSON boolean.

current_part_group_complete must be a real JSON boolean.

recommended_next_part_group must be a number.



============================================================
26. FINAL QUALITY CHECK
============================================================

Before returning the JSON, internally verify:

1. Am I teaching ${targetLanguage}?

2. Am I explaining primarily in ${sourceLanguage}?

3. Am I still inside the curriculum main target?

4. Is this logically the next lesson part?

5. Did I avoid unnecessary repetition?

6. Is the target expression natural in ${targetLanguage}?

7. Did I avoid blindly copying English sentence structure?

8. Is the lesson appropriate for the learner's current level?

9. Did I build on existing learner knowledge?

10. Is the JSON valid and parseable?

11. Did I return exactly ONE lesson part?

12. Did I avoid moving the course position myself?

Return only the final JSON object.
`;


    return prompt.trim();
}



// ============================================================
// VALIDATE CONTEXT
// ============================================================

function validateContext(context) {

    if (!context) {

        throw new Error(
            "prepareLessonPrompt requires a context object."
        );

    }


    if (!context.learner) {

        throw new Error(
            "Learner information is missing."
        );

    }


    if (!context.learner.sourceLanguage) {

        throw new Error(
            "sourceLanguage is missing."
        );

    }


    if (!context.learner.targetLanguage) {

        throw new Error(
            "targetLanguage is missing."
        );

    }


    if (!context.position) {

        throw new Error(
            "Course position is missing."
        );

    }


    if (
        context.position.standard ===
        undefined
    ) {

        throw new Error(
            "Standard number is missing."
        );

    }


    if (
        context.position.lesson ===
        undefined
    ) {

        throw new Error(
            "Lesson number is missing."
        );

    }


    if (
        context.position.part ===
        undefined
    ) {

        throw new Error(
            "Lesson part number is missing."
        );

    }


    if (!context.curriculum) {

        throw new Error(
            "Curriculum blueprint is missing."
        );

    }

}



// ============================================================
// PREPARE CURRICULUM
// ============================================================

function prepareCurriculumText(
    curriculum
) {

    try {

        return JSON.stringify(
            curriculum,
            null,
            2
        );

    } catch (error) {

        console.error(
            "Could not prepare curriculum:",
            error
        );

        return "{}";

    }

}



// ============================================================
// PREPARE KNOWLEDGE
// ============================================================

function prepareKnowledgeText(
    knowledge
) {

    const safeKnowledge = {

        vocabulary:
            knowledge.vocabulary || [],

        expressions:
            knowledge.expressions || [],

        grammar:
            knowledge.grammar || [],

        pronunciation:
            knowledge.pronunciation || [],

        concepts:
            knowledge.concepts || [],

        commonMistakes:
            knowledge.commonMistakes || []

    };


    const hasKnowledge =
        Object.values(
            safeKnowledge
        )
        .some(
            list =>
                Array.isArray(list) &&
                list.length > 0
        );


    if (!hasKnowledge) {

        return `
No recorded knowledge yet.

Treat the learner according to the curriculum's starting difficulty.
        `.trim();

    }


    return JSON.stringify(
        safeKnowledge,
        null,
        2
    );

}



// ============================================================
// PREPARE PREVIOUS LESSON SUMMARIES
// ============================================================

function preparePreviousLessonsText(
    summaries
) {

    if (
        !Array.isArray(summaries) ||
        summaries.length === 0
    ) {

        return "No previous lesson summaries.";

    }


    // Keep recent information most relevant.
    //
    // We do not need to send hundreds of summaries
    // to GPT every time.
    const recent =
        summaries.slice(-20);


    return JSON.stringify(
        recent,
        null,
        2
    );

}



// ============================================================
// PREPARE RECENT CHAT
// ============================================================

function prepareRecentChatText(
    chat
) {

    if (
        !Array.isArray(chat) ||
        chat.length === 0
    ) {

        return "No recent learner-teacher chat.";

    }


    const cleaned =
        chat
        .slice(-10)
        .map(item => ({

            role:
                item.role || "",

            content:
                item.content || "",

            lesson:
                item.lesson ?? null,

            part:
                item.part ?? null

        }));


    return JSON.stringify(
        cleaned,
        null,
        2
    );

}



// ============================================================
// PREPARE SIMPLE LIST
// ============================================================

function prepareSimpleList(
    list
) {

    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        return "None.";

    }


    return JSON.stringify(
        list,
        null,
        2
    );

}



// ============================================================
// OPTIONAL:
// PREPARE A PROMPT FOR ASKING THE TEACHER
// ============================================================
//
// This is separate from generating the next lesson.
//
// Example:
//
// Learner is currently on:
//
// Lesson 1.2
//
// Learner asks:
//
// "Why do we use are here?"
//
// This should NOT advance the curriculum.
//
// ============================================================

export async function prepareTeacherChatPrompt(
    context,
    learnerMessage
) {

    validateContext(context);


    if (!learnerMessage) {

        throw new Error(
            "Learner message is required."
        );

    }


    const sourceLanguage =
        context.learner.sourceLanguage;

    const targetLanguage =
        context.learner.targetLanguage;


    const currentLesson =
        getCurrentGeneratedLesson(
            context
        );


    const prompt = `
You are MASTER LANGUAGE GPT.

You are currently acting as the learner's private language teacher.

The learner speaks:

${sourceLanguage}

The learner is learning:

${targetLanguage}


The learner is currently at:

Standard ${context.position.standard}
Lesson ${context.position.lesson}
Part ${context.position.part}


CURRENT GENERATED LESSON:

${JSON.stringify(
    currentLesson,
    null,
    2
)}


RECORDED LEARNER KNOWLEDGE:

${prepareKnowledgeText(
    context.knowledge || {}
)}


RECENT CHAT:

${prepareRecentChatText(
    context.recentChat || []
)}


THE LEARNER ASKS:

${learnerMessage}


Answer the learner's question clearly.

Use ${sourceLanguage} primarily for explanations.

Use ${targetLanguage} for the language being taught.

Stay appropriate to the learner's current level.

You may explain more deeply if the learner's question requires it.

Do not automatically advance the lesson.

Do not generate a new lesson part unless the learner explicitly asks for a new lesson.

Return only valid JSON using this structure:

{
  "answer": "main answer",
  "examples": [
    {
      "target": "example in target language",
      "source": "meaning in learner language"
    }
  ],
  "knowledge_update": {
    "vocabulary_introduced": [],
    "expressions_introduced": [],
    "grammar_introduced": [],
    "pronunciation_introduced": [],
    "concepts_reviewed": []
  }
}

Return only JSON.
`;


    return prompt.trim();

}



// ============================================================
// GET CURRENT GENERATED LESSON
// ============================================================

function getCurrentGeneratedLesson(
    context
) {

    const lesson =
        context.position.lesson;

    const part =
        context.position.part;


    const partId =
        `${lesson}.${part}`;


    if (
        context.generatedLessons &&
        context.generatedLessons[partId]
    ) {

        return context
            .generatedLessons[partId];

    }


    return {
        partId,
        information:
            "Current generated lesson was not supplied."
    };

}



// ============================================================
// OPTIONAL:
// PREPARE PRACTICE PROMPT
// ============================================================
//
// Practice does not move to a new lesson.
// GPT creates exercises using existing knowledge.
//
// ============================================================

export async function preparePracticePrompt(
    context,
    options = {}
) {

    validateContext(context);


    const {

        amount = 5,

        difficulty = "appropriate",

        practiceType = "mixed"

    } = options;


    const sourceLanguage =
        context.learner.sourceLanguage;

    const targetLanguage =
        context.learner.targetLanguage;


    const prompt = `
You are MASTER LANGUAGE GPT.

Create practice for the learner.

Learner language:

${sourceLanguage}

Target language:

${targetLanguage}


CURRENT POSITION:

Standard ${context.position.standard}
Lesson ${context.position.lesson}
Part ${context.position.part}


CURRENT CURRICULUM:

${prepareCurriculumText(
    context.curriculum
)}


KNOWN LEARNER KNOWLEDGE:

${prepareKnowledgeText(
    context.knowledge || {}
)}


PREVIOUS LESSON SUMMARIES:

${preparePreviousLessonsText(
    context.previousLessonSummaries || []
)}


PRACTICE SETTINGS:

Number of exercises:
${amount}

Difficulty:
${difficulty}

Practice type:
${practiceType}


RULES:

Use only concepts that have already been taught.

Do not introduce a major new grammar topic.

Practice ${targetLanguage}.

Give instructions primarily in ${sourceLanguage}.

Exercises should test understanding and production.

Use natural language.

Return only valid JSON:

{
  "title": "practice title",
  "instructions": "instructions",
  "exercises": [
    {
      "id": 1,
      "type": "exercise type",
      "question": "question",
      "options": [],
      "answer": "answer",
      "explanation": "brief explanation"
    }
  ]
}

Return exactly ${amount} exercises.

Return only JSON.
`;


    return prompt.trim();

}



// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {

    prepareLessonPrompt,

    prepareTeacherChatPrompt,

    preparePracticePrompt

};