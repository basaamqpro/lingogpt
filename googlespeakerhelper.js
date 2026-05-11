// ==============================
// GOOGLE SPEAKER HELPER
// LingoGPT Voice System
// ==============================


// ==============================
// VOICE DATABASE
// ==============================

const voices = {

  // ======================
  // ENGLISH
  // ======================
  English: [
    {
      name: "en-US-Chirp3-HD-Achernar",
      label: "🔥 Ultra Natural Male",
      gender: "MALE"
    },
    {
      name: "en-US-Chirp3-HD-Aoede",
      label: "🔥 Ultra Natural Female",
      gender: "FEMALE"
    },
    {
      name: "en-US-Neural2-J",
      label: "Neural2 Male",
      gender: "MALE"
    },
    {
      name: "en-US-Neural2-F",
      label: "Neural2 Female",
      gender: "FEMALE"
    },
    {
      name: "en-US-Studio-O",
      label: "Studio Female",
      gender: "FEMALE"
    },
    {
      name: "en-US-Studio-M",
      label: "Studio Male",
      gender: "MALE"
    }
  ],

  // ======================
  // ARABIC
  // ======================
  Arabic: [
    {
      name: "ar-XA-Chirp3-HD-Despina",
      label: "🔥 Ultra Natural Female",
      gender: "FEMALE"
    },
    {
      name: "ar-XA-Chirp3-HD-Fenrir",
      label: "🔥 Ultra Natural Male",
      gender: "MALE"
    },
    {
      name: "ar-XA-Neural2-A",
      label: "Neural2 Female",
      gender: "FEMALE"
    },
    {
      name: "ar-XA-Neural2-B",
      label: "Neural2 Male",
      gender: "MALE"
    }
  ],

  // ======================
  // JAPANESE
  // ======================
  Japanese: [
    {
      name: "ja-JP-Chirp3-HD-Achernar",
      label: "🔥 Ultra Natural Male",
      gender: "MALE"
    },
    {
      name: "ja-JP-Chirp3-HD-Aoede",
      label: "🔥 Ultra Natural Female",
      gender: "FEMALE"
    },
    {
      name: "ja-JP-Neural2-B",
      label: "Neural2 Female",
      gender: "FEMALE"
    },
    {
      name: "ja-JP-Neural2-C",
      label: "Neural2 Male",
      gender: "MALE"
    }
  ],

  // ======================
  // FRENCH
  // ======================
  French: [
    {
      name: "fr-FR-Chirp3-HD-Aoede",
      label: "🔥 Ultra Natural Female",
      gender: "FEMALE"
    },
    {
      name: "fr-FR-Chirp3-HD-Achernar",
      label: "🔥 Ultra Natural Male",
      gender: "MALE"
    },
    {
      name: "fr-FR-Neural2-A",
      label: "Neural2 Female",
      gender: "FEMALE"
    },
    {
      name: "fr-FR-Neural2-C",
      label: "Neural2 Male",
      gender: "MALE"
    }
  ],

  // ======================
  // SPANISH
  // ======================
  Spanish: [
    {
      name: "es-ES-Chirp3-HD-Aoede",
      label: "🔥 Ultra Natural Female",
      gender: "FEMALE"
    },
    {
      name: "es-ES-Chirp3-HD-Achernar",
      label: "🔥 Ultra Natural Male",
      gender: "MALE"
    },
    {
      name: "es-ES-Neural2-F",
      label: "Neural2 Female",
      gender: "FEMALE"
    },
    {
      name: "es-ES-Neural2-D",
      label: "Neural2 Male",
      gender: "MALE"
    }
  ]
};


// ==============================
// GET VOICES BY LANGUAGE
// ==============================

function getVoices(language) {
  return voices[language] || voices.English;
}


// ==============================
// GET DEFAULT VOICE
// ==============================

function getDefaultVoice(language, gender = "FEMALE") {
  const list = getVoices(language);

  return (
    list.find(v => v.gender === gender) ||
    list[0]
  );
}


// ==============================
// BUILD SPEECH REQUEST
// ==============================

function buildSpeechRequest(text, language, gender = "FEMALE") {
  const voice = getDefaultVoice(language, gender);

  return {
    text,
    voiceName: voice.name,
    languageCode: voice.name.split("-").slice(0, 2).join("-")
  };
}


// ==============================
// EXPORT (browser-safe)
// ==============================

window.GoogleSpeakerHelper = {
  voices,
  getVoices,
  getDefaultVoice,
  buildSpeechRequest
};