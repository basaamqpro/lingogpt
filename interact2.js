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
  LOCAL STORAGE
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
        "Invalid localStorage:",
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
  GET ORIGINAL SOURCE MESSAGE
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
    Fallback for older saved chats.
    */

    if (
      Array.isArray(
        chat?.source_flow
      )
    ) {
      return chat.source_flow
        .map(
          function(item) {
            return (
              item.source || ""
            );
          }
        )
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
        .map(
          function(item) {
            return (
              item.source || ""
            );
          }
        )
        .filter(Boolean)
        .join(" ")
        .trim();
    }


    return "";
  }


  /*
  ==================================================
  WHO SENT THE MESSAGE?
  ==================================================

  Your index.html now saves:

  message_type: "user"

  or:

  message_type: "interaction"

  ==================================================
  */

  function getSpeaker(chat) {
    if (
      chat?.message_type ===
        "interaction" ||
      chat?.is_interaction ===
        true
    ) {
      return "conversation_partner";
    }


    return "user";
  }


  /*
  ==================================================
  ROOM HISTORY
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
        : 12;


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
        function(chat) {
          return {
            speaker:
              getSpeaker(chat),

            text:
              getChatSourceText(
                chat
              )
          };
        }
      )
      .filter(
        function(item) {
          return Boolean(
            item.text
          );
        }
      );
  }


  /*
  ==================================================
  TURN HISTORY INTO A CONVERSATION
  ==================================================
  */

  function historyToText(
    history
  ) {
    if (!history.length) {
      return (
        "[Conversation has not started yet]"
      );
    }


    return history
      .map(
        function(item) {
          if (
            item.speaker ===
            "conversation_partner"
          ) {
            return (
              "OTHER PERSON: " +
              item.text
            );
          }


          return (
            "USER: " +
            item.text
          );
        }
      )
      .join("\n");
  }


  /*
  ==================================================
  EXTRACT OPENAI TEXT
  ==================================================
  */

  function extractOutputText(data) {
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
  CLEAN RESPONSE
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
    Remove quotes if the model
    unnecessarily adds them.
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
        "Interaction failed.";


      throw new Error(
        typeof message ===
          "string"
          ? message
          : "Interaction failed."
      );
    }


    const output =
      extractOutputText(
        data
      );


    if (!output) {
      throw new Error(
        "No reply was generated."
      );
    }


    return cleanSentence(
      output
    );
  }


  /*
  ==================================================
  CONVERSATIONAL PROMPT
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


    const conversation =
      historyToText(
        history
      );


    return `
You are the OTHER PERSON in a normal two-person conversation.

You are NOT acting as a teacher.
You are NOT acting as an AI assistant.
You are NOT explaining the language.

You are simply talking naturally with the user.

The user is practising:

SOURCE LANGUAGE:
${sourceLanguage}

TARGET LANGUAGE:
${targetLanguage}

You must speak in:

${sourceLanguage}

Here is the conversation so far:

${conversation}

YOUR ROLE:

Continue the conversation as the OTHER PERSON.

Read what the user has been talking about.

Pay special attention to the most recent USER message.

Respond the way another real person might naturally respond.

For example, if the user says:

"I went to the market today."

A natural response could be:

"Oh nice, what did you buy?"

If the user says:

"I bought some oranges and bread."

A natural response could be:

"That sounds good. Do you go there often?"

If the user says:

"I am very tired today."

A natural response could be:

"You should get some rest."

If the user says:

"I like football."

A natural response could be:

"Me too! Which team do you like?"

CONVERSATION RULES:

- Respond directly to what the user said.
- Continue the same topic when possible.
- Sound like another person talking.
- Be friendly and natural.
- Use beginner-friendly language.
- Use ordinary everyday vocabulary.
- Keep the reply short.
- Usually use one sentence.
- Sometimes use two very short sentences when natural.
- You may ask a simple follow-up question.
- You may answer, react, agree, disagree gently, or make a related comment.
- Do not ask a question every time.
- Vary your responses naturally.
- Remember relevant information from earlier messages in this conversation.
- Do not randomly change the topic.
- Do not repeat the user's exact sentence.
- Do not constantly say things like "That sounds great."
- Do not sound robotic.
- Do not sound like a language lesson.
- Do not mention translation.
- Do not mention pronunciation.
- Do not explain grammar.
- Do not mention being an AI.
- Do not say "As an AI".
- Do not give several response options.

LANGUAGE RULE:

Your entire reply must be written ONLY in ${sourceLanguage}.

Do NOT write the ${targetLanguage} translation.

results.js will handle the translation later.

OUTPUT RULE:

Return ONLY what the other person would say.

No labels.
No quotes.
No Markdown.
No explanation.
`;
  }


  /*
  ==================================================
  GENERATE NATURAL REPLY
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
        12
      );


    const prompt =
      buildInteractionPrompt(
        room,
        history
      );


    updateStatus(
      settings.onStatus,
      "Thinking of a reply..."
    );


    const sentence =
      await callAPI(
        prompt,
        settings
      );


    if (!sentence) {
      throw new Error(
        "No reply was generated."
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
  */

  async function interact(
    options
  ) {
    const settings =
      options || {};


    /*
    results.js must already exist.
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
    ==================================================
    STEP 1

    Generate the conversational reply.
    ==================================================
    */

    const interaction =
      await generateInteractionSentence(
        room,
        settings
      );


    const sentence =
      interaction.sentence;


    /*
    ==================================================
    STEP 2

    Pass that reply through results.js.
    ==================================================
    */

    updateStatus(
      settings.onStatus,
      "Translating the reply..."
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
    ==================================================
    */

    latestInteraction = {

      isInteraction:
        true,

      messageType:
        "interaction",


      /*
      What the other person actually said.
      */

      interactionText:
        sentence,


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
  LATEST INTERACTION
  ==================================================
  */

  function getLatestInteraction() {
    return latestInteraction;
  }


  /*
  ==================================================
  GLOBAL
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
                12
              )
            : [];
        },

      getLatestInteraction:
        getLatestInteraction
    });


})(window);