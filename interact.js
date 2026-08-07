(function (global) {
  "use strict";


  /*
  ==================================================
  SETTINGS
  ==================================================
  */

  const API_ENDPOINT =
    "/api/translate";


  const STORAGE_KEYS = {
    users:
      "lingo_user_details",

    data:
      "lingo_user_data",

    session:
      "lingo_logged_in_user",

    currentRoom:
      "lingo_current_room"
  };


  /*
  ==================================================
  INTERNAL STATE
  ==================================================
  */

  let latestInteraction = null;


  /*
  ==================================================
  STATUS
  ==================================================
  */

  function updateStatus(
    callback,
    message
  ) {
    if (
      typeof callback ===
      "function"
    ) {
      callback(message);
    }
  }


  /*
  ==================================================
  READ LOCAL STORAGE
  ==================================================
  */

  function readArray(key) {
    try {
      const value =
        JSON.parse(
          localStorage.getItem(key) ||
          "[]"
        );

      return Array.isArray(value)
        ? value
        : [];

    } catch (error) {
      console.error(
        "Invalid localStorage data:",
        key,
        error
      );

      return [];
    }
  }


  /*
  ==================================================
  CURRENT USER
  ==================================================
  */

  function getCurrentUser() {
    const users =
      readArray(
        STORAGE_KEYS.users
      );

    const userIdx =
      localStorage.getItem(
        STORAGE_KEYS.session
      );


    if (!userIdx) {
      return null;
    }


    return users.find(
      function(user) {
        return (
          user.user_idx ===
          userIdx
        );
      }
    ) || null;
  }


  /*
  ==================================================
  CURRENT USER DATA
  ==================================================
  */

  function getCurrentUserData() {
    const data =
      readArray(
        STORAGE_KEYS.data
      );

    const userIdx =
      localStorage.getItem(
        STORAGE_KEYS.session
      );


    if (!userIdx) {
      return null;
    }


    return data.find(
      function(item) {
        return (
          item.user_idx ===
          userIdx
        );
      }
    ) || null;
  }


  /*
  ==================================================
  CURRENT ROOM
  ==================================================
  */

  function getCurrentRoom() {
    const userData =
      getCurrentUserData();

    const roomIdx =
      localStorage.getItem(
        STORAGE_KEYS.currentRoom
      );


    if (
      !userData ||
      !roomIdx ||
      !Array.isArray(
        userData.rooms
      )
    ) {
      return null;
    }


    return userData.rooms.find(
      function(room) {
        return (
          room.room_idx ===
          roomIdx
        );
      }
    ) || null;
  }


  /*
  ==================================================
  GET ORIGINAL SOURCE TEXT
  FROM ONE SAVED CHAT
  ==================================================
  */

  function getChatSourceText(chat) {
    if (
      Array.isArray(
        chat?.prompts_and_answers
      ) &&
      chat.prompts_and_answers.length
    ) {
      const lastEntry =
        chat.prompts_and_answers[
          chat.prompts_and_answers.length - 1
        ];

      if (
        lastEntry &&
        lastEntry.user_prompt
      ) {
        return String(
          lastEntry.user_prompt
        ).trim();
      }
    }


    /*
    Older saved messages may not have
    prompts_and_answers.

    Reconstruct source sentence instead.
    */

    if (
      Array.isArray(
        chat?.source_flow
      )
    ) {
      return chat.source_flow
        .map(function(item) {
          return item.source || "";
        })
        .filter(Boolean)
        .join(" ")
        .trim();
    }


    if (
      Array.isArray(
        chat?.groups
      )
    ) {
      return chat.groups
        .map(function(item) {
          return item.source || "";
        })
        .filter(Boolean)
        .join(" ")
        .trim();
    }


    return "";
  }


  /*
  ==================================================
  GET TARGET SENTENCE
  FROM ONE SAVED CHAT

  This is only context for ChatGPT.
  ==================================================
  */

  function getChatTargetText(chat) {
    const flow =
      Array.isArray(
        chat?.target_flow
      )
        ? chat.target_flow
        : [];


    if (flow.length) {
      return flow
        .map(function(item) {
          return (
            item.target ||
            item.translation ||
            ""
          );
        })
        .filter(Boolean)
        .join(" ")
        .trim();
    }


    if (
      Array.isArray(
        chat?.groups
      )
    ) {
      return chat.groups
        .map(function(item) {
          return (
            item.translation ||
            item.target ||
            ""
          );
        })
        .filter(Boolean)
        .join(" ")
        .trim();
    }


    return "";
  }


  /*
  ==================================================
  BUILD ROOM HISTORY
  ==================================================

  Only use recent messages.

  This prevents the prompt from becoming
  unnecessarily large as the room grows.
  ==================================================
  */

  function getRoomHistory(
    room,
    maxMessages
  ) {
    const limit =
      Number.isInteger(
        Number(maxMessages)
      )
        ? Number(maxMessages)
        : 8;


    if (
      !room ||
      !Array.isArray(
        room.room_data
      )
    ) {
      return [];
    }


    return room.room_data
      .slice(-limit)
      .map(
        function(
          chat,
          index
        ) {
          return {
            number:
              index + 1,

            source:
              getChatSourceText(
                chat
              ),

            target:
              getChatTargetText(
                chat
              )
          };
        }
      )
      .filter(
        function(item) {
          return Boolean(
            item.source
          );
        }
      );
  }


  /*
  ==================================================
  CONVERT HISTORY TO TEXT
  ==================================================
  */

  function historyToText(
    history,
    sourceLanguage,
    targetLanguage
  ) {
    if (!history.length) {
      return (
        "There are no previous " +
        "messages in this room."
      );
    }


    return history
      .map(
        function(item) {
          let text =
            "MESSAGE " +
            item.number +
            "\n";


          text +=
            sourceLanguage +
            ": " +
            item.source;


          if (item.target) {
            text +=
              "\n" +
              targetLanguage +
              ": " +
              item.target;
          }


          return text;
        }
      )
      .join(
        "\n\n"
      );
  }


  /*
  ==================================================
  EXTRACT OPENAI RESPONSE TEXT
  ==================================================
  */

  function extractOutputText(
    data
  ) {
    if (
      !Array.isArray(
        data?.output
      )
    ) {
      return "";
    }


    return data.output
      .flatMap(
        function(outputItem) {
          return Array.isArray(
            outputItem.content
          )
            ? outputItem.content
            : [];
        }
      )
      .filter(
        function(contentItem) {
          return (
            contentItem.type ===
              "output_text" &&

            typeof contentItem.text ===
              "string"
          );
        }
      )
      .map(
        function(contentItem) {
          return contentItem.text;
        }
      )
      .join("")
      .trim();
  }


  /*
  ==================================================
  CLEAN GENERATED SENTENCE
  ==================================================
  */

  function cleanSentence(text) {
    let result =
      String(
        text || ""
      )
        .trim()
        .replace(
          /^```[\w-]*\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();


    /*
    Remove accidental quotation marks.
    */

    if (
      (
        result.startsWith('"') &&
        result.endsWith('"')
      ) ||
      (
        result.startsWith("'") &&
        result.endsWith("'")
      )
    ) {
      result =
        result.slice(
          1,
          -1
        );
    }


    return result.trim();
  }


  /*
  ==================================================
  API CALL
  ==================================================
  */

  async function callAPI(
    prompt,
    options
  ) {
    const settings =
      options || {};


    const response =
      await fetch(
        settings.apiEndpoint ||
        API_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              prompt: prompt
            }),

          signal:
            settings.signal
        }
      );


    let data;


    try {
      data =
        await response.json();

    } catch (error) {
      throw new Error(
        "The server returned invalid JSON."
      );
    }


    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        "The interaction request failed.";


      throw new Error(
        typeof message ===
          "string"
          ? message
          : "The interaction request failed."
      );
    }


    const outputText =
      extractOutputText(
        data
      );


    if (!outputText) {
      throw new Error(
        "ChatGPT returned no interaction sentence."
      );
    }


    return cleanSentence(
      outputText
    );
  }


  /*
  ==================================================
  INTERACTION PROMPT
  ==================================================
  */

  function buildInteractionPrompt(
    room,
    history
  ) {
    const sourceLanguage =
      room.source_language ||
      "English";

    const targetLanguage =
      room.target_language ||
      "Japanese";


    const historyText =
      historyToText(
        history,
        sourceLanguage,
        targetLanguage
      );


    return `
You are participating in a very simple language-learning conversation.

The learner is practising:

SOURCE LANGUAGE:
${sourceLanguage}

TARGET LANGUAGE:
${targetLanguage}

Below are the previous messages from the current conversation room.

${historyText}

YOUR TASK:

Read the previous conversation.

Respond naturally with ONE new very simple sentence that continues or relates to the conversation.

IMPORTANT:

- Write your response ONLY in ${sourceLanguage}.
- Use beginner-level language.
- Keep the sentence short.
- Prefer approximately 3 to 10 words.
- Use common everyday vocabulary.
- Respond naturally to the previous messages.
- Do not repeat the exact previous sentence.
- Do not explain grammar.
- Do not provide a translation.
- Do not provide pronunciation.
- Do not provide alternatives.
- Do not number the response.
- Do not use Markdown.
- Do not place the sentence inside quotation marks.
- Return ONLY the sentence.

If there is no previous conversation, create one very simple beginner sentence in ${sourceLanguage}.
`;
  }


  /*
  ==================================================
  GENERATE CHATGPT SENTENCE
  ==================================================
  */

  async function generateInteractionSentence(
    room,
    options
  ) {
    const settings =
      options || {};


    const history =
      getRoomHistory(
        room,
        settings.maxHistory ||
        8
      );


    const prompt =
      buildInteractionPrompt(
        room,
        history
      );


    updateStatus(
      settings.onStatus,
      "Thinking of a simple reply..."
    );


    const sentence =
      await callAPI(
        prompt,
        settings
      );


    if (!sentence) {
      throw new Error(
        "No interaction sentence was generated."
      );
    }


    return {
      sentence:
        sentence,

      history:
        history
    };
  }


  /*
  ==================================================
  MAIN INTERACT FUNCTION
  ==================================================

  This is the function index.html
  will call.

  Example:

  const interaction =
    await LingoGPTInteract.interact();

  ==================================================
  */

  async function interact(
    options
  ) {
    const settings =
      options || {};


    /*
    results.js must already be loaded.
    */

    if (
      !global.LingoGPTResults ||
      typeof global
        .LingoGPTResults
        .generateResults !==
        "function"
    ) {
      throw new Error(
        "results.js must be loaded before interact.js."
      );
    }


    const user =
      getCurrentUser();


    if (!user) {
      throw new Error(
        "No logged-in user was found."
      );
    }


    const room =
      getCurrentRoom();


    if (!room) {
      throw new Error(
        "No selected room was found."
      );
    }


    const sourceLanguage =
      room.source_language ||
      "English";

    const targetLanguage =
      room.target_language ||
      "Japanese";


    /*
    STEP 1

    ChatGPT reads previous room chats
    and creates one simple new sentence.
    */

    const interaction =
      await generateInteractionSentence(
        room,
        settings
      );


    const sentence =
      interaction.sentence;


    /*
    STEP 2

    Send ChatGPT's sentence through
    your existing results.js.

    This creates:

    targetFlow
    sourceFlow
    groups
    pronunciation
    sentence breakdown
    etc.
    */

    updateStatus(
      settings.onStatus,
      "Breaking down the reply..."
    );


    const translationResults =
      await global
        .LingoGPTResults
        .generateResults({
          text:
            sentence,

          sourceLanguage:
            sourceLanguage,

          targetLanguage:
            targetLanguage,

          signal:
            settings.signal,

          onStatus:
            function(message) {
              if (
                message &&
                message !==
                  "Complete."
              ) {
                updateStatus(
                  settings.onStatus,
                  message
                );
              }
            }
        });


    /*
    ==================================================
    FINAL RESULT

    It deliberately resembles results.js
    so index.html can treat it almost like
    a normal translation.
    ==================================================
    */

    latestInteraction = {

      isInteraction:
        true,


      /*
      The actual sentence ChatGPT created.
      */

      interactionText:
        sentence,


      /*
      Same aliases used by normal translation.
      */

      request: {
        text:
          sentence,

        sourceLanguage:
          sourceLanguage,

        targetLanguage:
          targetLanguage
      },


      detectedLanguage:
        translationResults
          .detectedLanguage ||
        sourceLanguage,


      targetLanguage:
        translationResults
          .targetLanguage ||
        targetLanguage,


      targetFlow:
        Array.isArray(
          translationResults
            .targetFlow
        )
          ? translationResults
              .targetFlow
          : [],


      sourceFlow:
        Array.isArray(
          translationResults
            .sourceFlow
        )
          ? translationResults
              .sourceFlow
          : [],


      groups:
        Array.isArray(
          translationResults.groups
        )
          ? translationResults.groups
          : [],


      activeFlow:
        "target",


      /*
      Useful information about what
      ChatGPT saw before replying.
      */

      history:
        interaction.history,


      roomIdx:
        room.room_idx,


      generatedAt:
        new Date()
          .toISOString()
    };


    global.lingoInteraction =
      latestInteraction;


    updateStatus(
      settings.onStatus,
      "Complete."
    );


    return latestInteraction;
  }


  /*
  ==================================================
  GET LAST INTERACTION
  ==================================================
  */

  function getLatestInteraction() {
    return latestInteraction;
  }


  /*
  ==================================================
  GLOBAL API
  ==================================================
  */

  global.lingoInteraction =
    null;


  global.LingoGPTInteract =
    Object.freeze({

      interact:
        interact,

      getCurrentRoom:
        getCurrentRoom,

      getRoomHistory:
        function() {
          const room =
            getCurrentRoom();

          return room
            ? getRoomHistory(
                room,
                8
              )
            : [];
        },

      getLatestInteraction:
        getLatestInteraction
    });


})(window);