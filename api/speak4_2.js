export default async function handler(req, res) {
  try {
    const { text, languageCode, voiceName, speed } = req.body;

    const key = process.env.GOOGLE_TTS_KEY;

    if (!key) {
      return res.status(500).json({ error: "Missing GOOGLE_TTS_KEY" });
    }

    if (!text || !languageCode || !voiceName) {
      return res.status(400).json({
        error: "Missing required fields: text, languageCode, voiceName"
      });
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: {
            text
          },

          voice: {
            languageCode: languageCode.toLowerCase(),
            name: voiceName
          },

          audioConfig: {
            audioEncoding: "MP3",

            // 🔥 SPEED CONTROL FIX
            speakingRate: speed ? parseFloat(speed) : 1.0
          }
        })
      }
    );

    const data = await response.json();

    // 🔴 Google error handling
    if (data.error) {
      console.error("Google TTS Error:", data);
      return res.status(500).json(data);
    }

    // ✅ success
    return res.status(200).json({
      audioContent: data.audioContent
    });

  } catch (err) {
    console.error("TTS Server Error:", err);

    return res.status(500).json({
      error: "TTS request failed",
      details: err.message
    });
  }
}