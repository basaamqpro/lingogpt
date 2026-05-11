export default async function handler(req, res) {

  try {

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      text,
      voiceName,
      languageCode,
      speed = 1
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const requestBody = {
      input: { text },

      voice: {
        name: voiceName || "en-US-Neural2-F",
        languageCode: languageCode || "en-US"
      },

      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: speed
      }
    };

    const response = await fetch(
  `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Google TTS Error:", data);
      return res.status(500).json({
        error: "Google TTS failed",
        details: data
      });
    }

    return res.status(200).json({
      audioContent: data.audioContent
    });

  } catch (err) {
    console.error("Speak API error:", err);

    return res.status(500).json({
      error: err.message
    });
  }
}