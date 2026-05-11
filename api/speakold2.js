export default async function handler(req, res) {

  try {

    const { text, languageCode } = req.body;

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
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
            languageCode: languageCode,
            ssmlGender: "NEUTRAL"
          },

          audioConfig: {
            audioEncoding: "MP3"
          }
        })
      }
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}