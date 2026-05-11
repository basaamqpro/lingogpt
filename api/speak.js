// ==========================
// GOOGLE CLOUD TTS SPEAK.JS
// ==========================

// ---------- DOM ----------
const voiceSelect = document.getElementById("voice");
const speedSelect = document.getElementById("speed");

// ---------- VOICES ----------
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

// ---------- LANGUAGE CODES ----------
const languageCodes = {
  English: "en-US",
  Arabic: "ar-XA",
  Japanese: "ja-JP",
  French: "fr-FR",
  Spanish: "es-ES"
};

// ==========================
// LOAD VOICES
// ==========================
function loadVoices(language) {

  voiceSelect.innerHTML = "";

  const list = voices[language] || [];

  list.forEach(v => {

    const option = document.createElement("option");

    option.value = v.name;
    option.textContent = v.label;

    voiceSelect.appendChild(option);
  });
}

// ==========================
// SPEAK FUNCTION
// ==========================
async function speakText(text, language) {

  if (!text) return;

  const selectedVoice = voiceSelect.value;

  const speed = parseFloat(speedSelect.value);

  try {

    const res = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({

        text,

        languageCode: languageCodes[language],

        voiceName: selectedVoice,

        speakingRate: speed
      })
    });

    const data = await res.json();

    console.log("TTS RESPONSE:", data);

    if (!data.audioContent) {
      alert("No audio returned");
      return;
    }

    const audio = new Audio(
      "data:audio/mp3;base64," + data.audioContent
    );

    audio.play();

  } catch (err) {

    console.error(err);

    alert("Speech error");
  }
}