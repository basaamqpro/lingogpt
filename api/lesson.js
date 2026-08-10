// ============================================================
// /api/lesson.js
// ============================================================
//
// MASTER LANGUAGE - SERVER API ROUTE
//
// THIS FILE IS THE SECURE BRIDGE BETWEEN:
//
// gpt_api_call.js
//
//          ↓
//
// /api/lesson
//
//          ↓
//
// OpenAI Responses API
//
// ------------------------------------------------------------
//
// THIS FILE DOES NOT:
//
// - know which lesson the learner is studying
// - load curriculum JSON files
// - translate languages
// - decide what to teach
// - manage rooms
// - manage localStorage
// - manage progress
// - create lesson prompts
//
// It ONLY:
//
// 1. receives a prepared prompt
// 2. validates it
// 3. securely uses OPENAI_API_KEY
// 4. calls OpenAI
// 5. asks OpenAI for JSON
// 6. returns the OpenAI response
//
// ============================================================



// ============================================================
// CONFIGURATION
// ============================================================

const OPENAI_API_URL =
    "https://api.openai.com/v1/responses";



const DEFAULT_MODEL =
    "gpt-5.4-mini";



// ============================================================
// MAIN VERCEL API HANDLER
// ============================================================

export default async function handler(
    req,
    res
) {

    console.log(
        "➡️ API HIT /api/lesson"
    );



    // ========================================================
    // ONLY ALLOW POST
    // ========================================================

    if (
        req.method !== "POST"
    ) {

        res.setHeader(
            "Allow",
            "POST"
        );


        return res.status(405).json({

            error:
                "Method not allowed. Use POST."

        });

    }



    try {

        // ====================================================
        // CHECK API KEY
        // ====================================================

        const apiKey =
            process.env.OPENAI_API_KEY;


        if (!apiKey) {

            console.error(
                "❌ OPENAI_API_KEY is missing."
            );


            return res.status(500).json({

                error:
                    "OpenAI API key is not configured on the server."

            });

        }



        // ====================================================
        // READ REQUEST BODY
        // ====================================================

        const body =
            getRequestBody(
                req
            );


        const prompt =
            body?.prompt;



        // ====================================================
        // VALIDATE PROMPT
        // ====================================================

        if (
            typeof prompt !==
            "string"
        ) {

            return res.status(400).json({

                error:
                    "A prompt string is required."

            });

        }



        const cleanedPrompt =
            prompt.trim();



        if (!cleanedPrompt) {

            return res.status(400).json({

                error:
                    "The prompt cannot be empty."

            });

        }



        // ====================================================
        // MODEL
        // ====================================================
        //
        // Default:
        //
        // gpt-5.4-mini
        //
        // But you can later add:
        //
        // OPENAI_MODEL=gpt-5.4-mini
        //
        // inside Vercel environment variables.
        //
        // This lets you change models without editing code.
        //
        // ====================================================

        const model =

            process.env.OPENAI_MODEL ||

            DEFAULT_MODEL;



        console.log(
            `🤖 Calling OpenAI model: ${model}`
        );



        // ====================================================
        // BUILD OPENAI REQUEST
        // ====================================================
        //
        // IMPORTANT:
        //
        // prepare_&_translate_for_gptapicall.js already created
        // the complete teaching prompt.
        //
        // We DO NOT modify the educational instructions here.
        //
        // ====================================================

        const openAIRequest = {

            model,

            input:
                cleanedPrompt,


            // =================================================
            // JSON MODE
            // =================================================
            //
            // We want the result to be valid JSON.
            //
            // The actual JSON structure is described inside
            // the prepared prompt.
            //
            // =================================================

            text: {

                format: {

                    type:
                        "json_object"

                }

            }

        };



        // ====================================================
        // CALL OPENAI
        // ====================================================

        const openAIResponse =
            await fetch(

                OPENAI_API_URL,

                {

                    method:
                        "POST",


                    headers: {

                        "Content-Type":
                            "application/json",


                        "Authorization":
                            `Bearer ${apiKey}`

                    },


                    body:
                        JSON.stringify(
                            openAIRequest
                        )

                }

            );



        // ====================================================
        // READ OPENAI RESPONSE
        // ====================================================

        const rawResponse =
            await openAIResponse.text();



        let data;



        try {

            data =
                rawResponse
                    ? JSON.parse(
                        rawResponse
                    )
                    : {};

        }

        catch (parseError) {

            console.error(
                "❌ OpenAI returned non-JSON response:",
                rawResponse
            );


            return res.status(502).json({

                error:
                    "OpenAI returned an invalid server response."

            });

        }



        // ====================================================
        // OPENAI API ERROR
        // ====================================================

        if (
            !openAIResponse.ok
        ) {

            console.error(
                "❌ OpenAI API error:",
                data
            );


            const message =

                data?.error?.message ||

                data?.error ||

                "OpenAI API request failed.";



            return res
                .status(
                    openAIResponse.status
                )
                .json({

                    error:
                        message,

                    openai_status:
                        openAIResponse.status

                });

        }



        // ====================================================
        // CHECK RESPONSE STATUS
        // ====================================================

        if (
            data?.status ===
            "failed"
        ) {

            console.error(
                "❌ OpenAI response status = failed",
                data
            );


            return res.status(502).json({

                error:

                    data?.error?.message ||

                    "OpenAI failed to generate the lesson."

            });

        }



        // ====================================================
        // HANDLE INCOMPLETE RESPONSE
        // ====================================================

        if (
            data?.status ===
            "incomplete"
        ) {

            const reason =

                data
                    ?.incomplete_details
                    ?.reason ||

                "unknown";


            console.error(
                "⚠️ OpenAI response incomplete:",
                reason
            );


            return res.status(502).json({

                error:
                    "OpenAI did not finish generating the lesson.",

                reason,

                response:
                    data

            });

        }



        // ====================================================
        // SUCCESS
        // ====================================================
        //
        // IMPORTANT:
        //
        // We return the RAW Responses API object.
        //
        // gpt_api_call.js already knows how to:
        //
        // - locate output_text
        // - clean it
        // - JSON.parse it
        // - return a normal lesson object
        //
        // ====================================================

        console.log(
            "✅ OpenAI lesson generated successfully."
        );


        return res
            .status(200)
            .json(data);

    }

    catch (error) {

        // ====================================================
        // NETWORK / SERVER ERROR
        // ====================================================

        console.error(
            "❌ /api/lesson error:",
            error
        );


        return res.status(500).json({

            error:

                error?.message ||

                "Internal server error."

        });

    }

}



// ============================================================
// GET REQUEST BODY
// ============================================================
//
// Vercel normally parses JSON automatically.
//
// But this helper also protects us if the body arrives
// as a string.
//
// ============================================================

function getRequestBody(req) {

    if (!req.body) {

        return {};

    }



    // --------------------------------------------------------
    // Already parsed
    // --------------------------------------------------------

    if (
        typeof req.body ===
        "object"
    ) {

        return req.body;

    }



    // --------------------------------------------------------
    // String body
    // --------------------------------------------------------

    if (
        typeof req.body ===
        "string"
    ) {

        try {

            return JSON.parse(
                req.body
            );

        }

        catch (error) {

            return {};

        }

    }



    return {};

}