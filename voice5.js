// // ==============================
// // LINGOGPT VOICE ENGINE
// // Google Cloud TTS wrapper
// // ==============================


// // ------------------------------
// // VOICE MAP
// // ------------------------------
// const voiceMap = {
//   Arabic: "ar-XA",
//   Japanese: "ja-JP",
//   French: "fr-FR",
//   Spanish: "es-ES",
//   English: "en-GB"
// };


// // ------------------------------
// // PLAY AUDIO (MAIN FUNCTION)
// // ------------------------------
// async function playAudio() {

//   const lang = document.getElementById("lang").value;
//   const text = document.getElementById("translated").innerText;

//   const voiceSelect = document.getElementById("voiceSelect");
//   const voiceName = voiceSelect?.value;

//   const speed = document.getElementById("speed")?.value || 1;

//   if (!text.trim()) {
//     alert("No translation yet");
//     return;
//   }

//   const languageCode = voiceMap[lang];

//   if (!languageCode || !voiceName) {
//     alert("Voice not selected");
//     return;
//   }

//   try {

//     const res = await fetch("/api/speak", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({
//         text,
//         languageCode,
//         voiceName,
//         speed
//       })
//     });

//     const data = await res.json();

//     if (!data.audioContent) {
//       throw new Error("No audio returned");
//     }

//     const audio = new Audio(
//       "data:audio/mp3;base64," + data.audioContent
//     );

//     audio.play();

//   } catch (err) {
//     console.error("TTS ERROR:", err);
//     alert("Voice failed");
//   }
// }


// // ------------------------------
// // OPTIONAL: expose globally
// // ------------------------------
// window.playAudio = playAudio;
// window.voiceMap = voiceMap;


// ==============================
// LINGOGPT VOICE ENGINE
// ==============================

// ------------------------------
// LANGUAGE MAP
// ------------------------------
const voiceMap = {
  Arabic: "ar-XA",
  Japanese: "ja-JP",
  French: "fr-FR",
  Spanish: "es-ES",
  English: "en-GB"
};

// ------------------------------
// VOICE DATABASE
// ------------------------------
const voices = {

  English: [
    { name: "en-US-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "en-US-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "en-US-Neural2-J", label: "Neural2 Male", gender: "MALE" },
    { name: "en-US-Neural2-F", label: "Neural2 Female", gender: "FEMALE" },
    { name: "en-US-Studio-O", label: "Studio Female", gender: "FEMALE" },
    { name: "en-US-Studio-M", label: "Studio Male", gender: "MALE" }
  ],

  Arabic: [
    { name: "ar-XA-Chirp3-HD-Despina", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "ar-XA-Chirp3-HD-Fenrir", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "ar-XA-Neural2-A", label: "Neural2 Female", gender: "FEMALE" },
    { name: "ar-XA-Neural2-B", label: "Neural2 Male", gender: "MALE" }
  ],

  Japanese: [
    { name: "ja-JP-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "ja-JP-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "ja-JP-Neural2-B", label: "Neural2 Female", gender: "FEMALE" },
    { name: "ja-JP-Neural2-C", label: "Neural2 Male", gender: "MALE" }
  ],

  French: [
    { name: "fr-FR-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "fr-FR-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "fr-FR-Neural2-A", label: "Neural2 Female", gender: "FEMALE" },
    { name: "fr-FR-Neural2-C", label: "Neural2 Male", gender: "MALE" }
  ],

  Spanish: [
    { name: "es-ES-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "es-ES-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "es-ES-Neural2-F", label: "Neural2 Female", gender: "FEMALE" },
    { name: "es-ES-Neural2-D", label: "Neural2 Male", gender: "MALE" }
  ]
};

// ------------------------------
// HELPERS
// ------------------------------
function getVoices(lang) {
  return voices[lang] || voices.English;
}

function getVoice(lang, voiceName) {
  return getVoices(lang).find(v => v.name === voiceName);
}

function getDefaultVoice(lang) {
  return getVoices(lang)[0];
}

// ------------------------------
// BUILD SPEECH REQUEST
// ------------------------------
function buildSpeechRequest(text, lang, voiceName, speed = 1) {

  const voice = getVoice(lang, voiceName) || getDefaultVoice(lang);

  const languageCode =
    voice.name.split("-").slice(0, 2).join("-");

  return {
    text,
    voiceName: voice.name,
    languageCode,
    speed
  };
}

// ------------------------------
// PLAY AUDIO (centralized)
// ------------------------------
async function playAudio(text, lang, voiceName, speed = 1) {

  const req = buildSpeechRequest(text, lang, voiceName, speed);

  const res = await fetch("/api/speak4_2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });

  const data = await res.json();

  const audio = new Audio(
    "data:audio/mp3;base64," + data.audioContent
  );

  audio.play();
}

// ------------------------------
// EXPORT
// ------------------------------
window.GoogleSpeakerHelper = {
  voices,
  voiceMap,
  getVoices,
  getVoice,
  getDefaultVoice,
  buildSpeechRequest,
  playAudio
};