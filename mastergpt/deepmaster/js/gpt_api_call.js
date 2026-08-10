// ============================================================
// gpt_api_call.js
// ============================================================
//
// MASTER LANGUAGE - GPT API MESSENGER
//
// THIS FILE HAS ONE MAIN JOB:
//
// prepared prompt
//      ↓
// POST /api/lesson
//      ↓
// receive OpenAI Responses API response
//      ↓
// extract GPT text
//      ↓
// convert JSON text into JavaScript object
//      ↓
// return object to machine_master_gpt.js
//
// ------------------------------------------------------------
//
// THIS FILE DOES NOT:
//
// - decide what lesson to teach
// - load lesson JSON files
// - manage rooms
// - manage progress
// - translate languages
// - explain grammar
// - decide examples
// - save lessons
//
// OpenAI does the intelligence.
//
// machine_master_gpt.js does the coordination.
//
// ============================================================



// ============================================================
// CONFIGURATION
// ============================================================

const GPT_API_CONFIG = {

    endpoint: "/api/lesson",

    method: "POST",

    timeout: 120000

};



// ============================================================
// MAIN GPT CALL
// ============================================================

export async function callGPT(prompt) {

    // --------------------------------------------------------
    // Validate prompt
    // --------------------------------------------------------

    if (
        !prompt ||
        typeof prompt !== "string"
    ) {

        throw new Error(
            "callGPT requires a prompt string."
        );

    }


    if (!prompt.trim()) {

        throw new Error(
            "The GPT prompt is empty."
        );

    }



    // --------------------------------------------------------
    // AbortController prevents a request from hanging forever.
    // --------------------------------------------------------

    const controller =
        new AbortController();


    const timeoutId =
        setTimeout(

            () => {

                controller.abort();

            },

            GPT_API_CONFIG.timeout

        );



    try {

        // ====================================================
        // CALL OUR SERVER
        // ====================================================

        const response =
            await fetch(

                GPT_API_CONFIG.endpoint,

                {

                    method:
                        GPT_API_CONFIG.method,


                    headers: {

                        "Content-Type":
                            "application/json"

                    },


                    body:
                        JSON.stringify({

                            prompt

                        }),


                    signal:
                        controller.signal

                }

            );



        // ====================================================
        // READ SERVER RESPONSE
        // ====================================================

        const data =
            await readResponseJSON(
                response
            );



        // ====================================================
        // HANDLE HTTP ERROR
        // ====================================================

        if (!response.ok) {

            const message =
                extractServerError(
                    data
                );


            throw new Error(

                message ||

                `GPT request failed with HTTP ${response.status}.`

            );

        }



        // ====================================================
        // HANDLE OPENAI ERROR OBJECT
        // ====================================================

        if (data?.error) {

            const errorMessage =

                data.error.message ||

                data.error ||

                "OpenAI returned an error.";


            throw new Error(
                errorMessage
            );

        }



        // ====================================================
        // CHECK RESPONSE STATUS
        // ====================================================

        if (
            data?.status === "failed"
        ) {

            throw new Error(

                data?.error?.message ||

                "The OpenAI response failed."

            );

        }



        // ====================================================
        // EXTRACT GENERATED TEXT
        // ====================================================

        const text =
            extractGPTText(
                data
            );



        if (!text) {

            console.error(
                "Raw GPT response:",
                data
            );


            throw new Error(
                "GPT returned no readable lesson content."
            );

        }



        // ====================================================
        // CLEAN JSON TEXT
        // ====================================================

        const cleaned =
            cleanJSONText(
                text
            );



        // ====================================================
        // PARSE GENERATED LESSON
        // ====================================================

        const parsed =
            parseGPTJSON(
                cleaned,
                data
            );



        // ====================================================
        // RETURN TO machine_master_gpt.js
        // ====================================================

        return parsed;

    }

    catch (error) {

        // ====================================================
        // REQUEST TIMEOUT
        // ====================================================

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "The GPT request took too long and was cancelled."
            );

        }



        console.error(
            "GPT API call failed:",
            error
        );


        throw error;

    }

    finally {

        clearTimeout(
            timeoutId
        );

    }

}



// ============================================================
// READ RESPONSE AS JSON
// ============================================================
//
// Our /api/lesson endpoint should normally return JSON.
//
// This helper gives us a clearer error if something such as
// an HTML error page is returned instead.
//
// ============================================================

async function readResponseJSON(
    response
) {

    const rawText =
        await response.text();


    if (!rawText) {

        return {};

    }


    try {

        return JSON.parse(
            rawText
        );

    }

    catch (error) {

        console.error(
            "Server returned non-JSON content:",
            rawText
        );


        throw new Error(
            "The server returned an invalid response."
        );

    }

}



// ============================================================
// EXTRACT GPT TEXT
// ============================================================
//
// Responses API responses can contain several output items.
//
// Therefore:
//
// DO NOT assume:
//
// data.output[0].content[0].text
//
// We search through all output message content instead.
//
// ============================================================

function extractGPTText(
    data
) {

    if (!data) {

        return "";

    }



    // ========================================================
    // OPTION 1
    // output_text
    //
    // Some response formats / SDK wrappers expose this
    // directly.
    // ========================================================

    if (
        typeof data.output_text ===
        "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }



    // ========================================================
    // OPTION 2
    // Search through Responses API output items
    // ========================================================

    if (
        Array.isArray(
            data.output
        )
    ) {

        const textParts = [];


        for (
            const outputItem
            of data.output
        ) {

            if (!outputItem) {

                continue;

            }



            // ------------------------------------------------
            // Usually generated assistant messages have
            // content arrays.
            // ------------------------------------------------

            if (
                Array.isArray(
                    outputItem.content
                )
            ) {

                for (
                    const contentItem
                    of outputItem.content
                ) {

                    if (!contentItem) {

                        continue;

                    }



                    // ----------------------------------------
                    // Standard output_text content
                    // ----------------------------------------

                    if (
                        contentItem.type ===
                            "output_text" &&
                        typeof contentItem.text ===
                            "string"
                    ) {

                        textParts.push(
                            contentItem.text
                        );

                        continue;

                    }



                    // ----------------------------------------
                    // Defensive fallback
                    // ----------------------------------------

                    if (
                        typeof contentItem.text ===
                            "string"
                    ) {

                        textParts.push(
                            contentItem.text
                        );

                    }

                }

            }

        }



        if (
            textParts.length > 0
        ) {

            return textParts
                .join("\n")
                .trim();

        }

    }



    // ========================================================
    // OPTION 3
    // Our API route could later return already-extracted text.
    // ========================================================

    if (
        typeof data.text ===
        "string"
    ) {

        return data.text.trim();

    }



    // ========================================================
    // OPTION 4
    // Our future API route may return:
    //
    // {
    //     result: "..."
    // }
    // ========================================================

    if (
        typeof data.result ===
        "string"
    ) {

        return data.result.trim();

    }



    return "";

}



// ============================================================
// CLEAN GPT JSON TEXT
// ============================================================
//
// Our prompt explicitly tells GPT:
//
// RETURN ONLY JSON.
//
// Normally nothing needs cleaning.
//
// This function simply protects us if the response accidentally
// contains:
//
// ```json
// {...}
// ```
//
// ============================================================

function cleanJSONText(
    text
) {

    if (
        typeof text !==
        "string"
    ) {

        return "";

    }


    let cleaned =
        text.trim();



    // --------------------------------------------------------
    // Remove ```json
    // --------------------------------------------------------

    if (
        cleaned.startsWith(
            "```json"
        )
    ) {

        cleaned =
            cleaned.substring(7);

    }



    // --------------------------------------------------------
    // Remove generic ```
    // --------------------------------------------------------

    else if (
        cleaned.startsWith(
            "```"
        )
    ) {

        cleaned =
            cleaned.substring(3);

    }



    // --------------------------------------------------------
    // Remove ending ```
    // --------------------------------------------------------

    if (
        cleaned.endsWith(
            "```"
        )
    ) {

        cleaned =
            cleaned.substring(
                0,
                cleaned.length - 3
            );

    }


    return cleaned.trim();

}



// ============================================================
// PARSE GPT JSON
// ============================================================

function parseGPTJSON(
    text,
    rawResponse = null
) {

    try {

        const parsed =
            JSON.parse(
                text
            );


        if (
            parsed === null ||
            typeof parsed !==
                "object"
        ) {

            throw new Error(
                "GPT JSON is not an object."
            );

        }


        return parsed;

    }

    catch (error) {

        console.error(
            "Could not parse GPT lesson JSON."
        );


        console.error(
            "GPT text:",
            text
        );


        console.error(
            "Raw OpenAI response:",
            rawResponse
        );


        throw new Error(
            "GPT returned lesson content, but the lesson JSON could not be parsed."
        );

    }

}



// ============================================================
// EXTRACT SERVER ERROR
// ============================================================

function extractServerError(
    data
) {

    if (!data) {

        return "";

    }



    // --------------------------------------------------------
    // {
    //     error: "..."
    // }
    // --------------------------------------------------------

    if (
        typeof data.error ===
        "string"
    ) {

        return data.error;

    }



    // --------------------------------------------------------
    // {
    //     error: {
    //         message: "..."
    //     }
    // }
    // --------------------------------------------------------

    if (
        data.error &&
        typeof data.error.message ===
            "string"
    ) {

        return data.error.message;

    }



    // --------------------------------------------------------
    // {
    //     message: "..."
    // }
    // --------------------------------------------------------

    if (
        typeof data.message ===
        "string"
    ) {

        return data.message;

    }



    return "";

}



// ============================================================
// OPTIONAL DIRECT RAW CALL
// ============================================================
//
// Useful while developing/debugging.
//
// Unlike callGPT(), this returns the complete raw API response
// without extracting/parsing the generated lesson.
//
// machine_master_gpt.js normally does NOT need this.
//
// ============================================================

export async function callGPTRaw(
    prompt
) {

    if (
        !prompt ||
        typeof prompt !== "string" ||
        !prompt.trim()
    ) {

        throw new Error(
            "callGPTRaw requires a prompt."
        );

    }


    const response =
        await fetch(

            GPT_API_CONFIG.endpoint,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        prompt

                    })

            }

        );


    const data =
        await readResponseJSON(
            response
        );


    if (!response.ok) {

        throw new Error(

            extractServerError(data) ||

            `GPT request failed with HTTP ${response.status}.`

        );

    }


    return data;

}



// ============================================================
// EXPORT HELPERS
// ============================================================
//
// Exporting these makes them easy to test individually later.
//
// ============================================================

export {

    extractGPTText,

    cleanJSONText,

    parseGPTJSON,

    GPT_API_CONFIG

};



// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {

    callGPT,

    callGPTRaw

};