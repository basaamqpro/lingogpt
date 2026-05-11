// ==============================
// LINGOGPT VOICE.JS (CLEAN + SAFE)
// ==============================


// ==============================
// LANGUAGE MAP (Google TTS)
// ==============================
const voiceMap = {
  Arabic: "ar-XA",
  Japanese: "ja-JP",
  French: "fr-FR",
  Spanish: "es-ES",
  English: "en-GB"
};


// ==============================
// VOICE DATABASE (CLEANED)
// ONLY WORKING CHIRP VOICES
// ==============================
const voices = {

  English: [
    { name: "en-US-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "en-US-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" }
  ],

  Arabic: [
    { name: "ar-XA-Chirp3-HD-Despina", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "ar-XA-Chirp3-HD-Fenrir", label: "🔥 Ultra Natural Male", gender: "MALE" }
  ],

  Japanese: [
    { name: "ja-JP-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" },
    { name: "ja-JP-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" }
  ],

  French: [
    { name: "fr-FR-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "fr-FR-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" }
  ],

  Spanish: [
    { name: "es-ES-Chirp3-HD-Aoede", label: "🔥 Ultra Natural Female", gender: "FEMALE" },
    { name: "es-ES-Chirp3-HD-Achernar", label: "🔥 Ultra Natural Male", gender: "MALE" }
  ]
};


// ==============================
// HELPERS
// ==============================
function getVoices(lang) {
  return voices[lang] || voices.English;
}

function getVoice(lang, voiceName) {
  return getVoices(lang).find(v => v.name === voiceName);
}

function getDefaultVoice(lang) {
  return getVoices(lang)[0];
}


// ==============================
// POPULATE DROPDOWN (FIXED SYNC)
// ==============================
function loadVoices() {
  const lang = document.getElementById("lang")?.value;
  const select = document.getElementById("voiceSelect");

  if (!select || !lang) return;

  const list = getVoices(lang);

  select.innerHTML = "";

  list.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = v.label;
    select.appendChild(opt);
  });

  // auto-select first voice
  if (list.length > 0) {
    select.value = list[0].name;
  }
}


// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {

  const lang = document.getElementById("lang");

  if (lang) {
    lang.addEventListener("change", loadVoices);
  }

  loadVoices();
});


// ==============================
// BUILD REQUEST (100% SAFE)
// ==============================
function buildRequest() {

  const lang = document.getElementById("lang").value;
  const voiceName = document.getElementById("voiceSelect").value;
  const speed = document.getElementById("speed")?.value || 1;
  const text = document.getElementById("translated")?.innerText?.trim();

  if (!text) {
    throw new Error("No translated text found");
  }

  const languageCode = voiceMap[lang];

  if (!languageCode) {
    throw new Error("Missing languageCode for " + lang);
  }

  const voice = getVoice(lang, voiceName);

  if (!voice) {
    throw new Error("Invalid voice selected");
  }

  return {
    text,
    languageCode,
    voiceName: voice.name,
    speed
  };
}


// ==============================
// PLAY AUDIO (ROBUST)
// ==============================
async function playAudio() {

  try {

    const req = buildRequest();

    const res = await fetch("/api/speak4_2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });

    const data = await res.json();

    if (!data.audioContent) {
      console.error("TTS ERROR:", data);

      // fallback: auto switch to first safe voice
      alert("Voice failed, switching fallback voice");

      const fallback = getDefaultVoice(
        document.getElementById("lang").value
      );

      document.getElementById("voiceSelect").value = fallback.name;

      return;
    }

    const audio = new Audio(
      "data:audio/mp3;base64," + data.audioContent
    );

    audio.play();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}


// ==============================
// EXPORT GLOBALS
// ==============================
window.playAudio = playAudio;
window.loadVoices = loadVoices;