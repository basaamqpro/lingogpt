import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";


import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


/*
==================================================
FIREBASE CONFIGURATION
==================================================
*/

const firebaseConfig = {
  apiKey:
    "AIzaSyDVh4UFpUIGLIDllXgB4V03PPHncg6llIA",

  authDomain:
    "two-todolist-project.firebaseapp.com",

  projectId:
    "two-todolist-project",

  storageBucket:
    "two-todolist-project.firebasestorage.app",

  messagingSenderId:
    "981585696379",

  appId:
    "1:981585696379:web:fcd35ed7176c86c64ef4de"
};


const app =
  initializeApp(
    firebaseConfig
  );


const database =
  getFirestore(app);



/*
==================================================
FIRESTORE COLLECTIONS
==================================================

account_Details

    user_basaam
        name
        email
        username
        password
        user_idx


lingo_Data

    user_basaam
        user_idx
        username
        rooms: [...]
==================================================
*/

const COLLECTIONS = {
  accounts:
    "account_Details",

  lingo:
    "lingo_Data"
};



/*
==================================================
LOCAL STORAGE
==================================================
*/

const STORAGE_KEYS = {
  users:
    "lingo_user_details",

  data:
    "lingo_user_data",

  session:
    "lingo_logged_in_user",

  currentRoom:
    "lingo_current_room",

  account:
    "account_details",

  savedLogin:
    "saved_login_details"
};



/*
==================================================
HELPERS
==================================================
*/

function createId(prefix) {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.floor(
      Math.random() * 10000
    )
  );
}


function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}


function showMessage(
  message,
  type
) {
  if (
    typeof window.showAuthMessage ===
    "function"
  ) {
    window.showAuthMessage(
      message,
      type
    );

    return;
  }


  console.log(
    type || "message",
    message
  );
}



/*
==================================================
LOCAL STORAGE HELPERS
==================================================
*/

function getSessionUserIdx() {
  return (
    localStorage.getItem(
      STORAGE_KEYS.session
    ) || ""
  );
}


function getCurrentRoomIdx() {
  return (
    localStorage.getItem(
      STORAGE_KEYS.currentRoom
    ) || ""
  );
}


function saveLocalAccount(
  account
) {
  const safeAccount = {
    user_idx:
      account.user_idx,

    username:
      account.username,

    name:
      account.name || "",

    email:
      account.email || "",

    website:
      account.website || "",

    experience:
      account.experience || 0,

    profile_pic:
      account.profile_pic || "",

    cv:
      account.cv || ""
  };


  /*
  Existing welcome/index pages
  expect this to be an array.
  */

  localStorage.setItem(
    STORAGE_KEYS.users,
    JSON.stringify([
      safeAccount
    ])
  );


  localStorage.setItem(
    STORAGE_KEYS.account,
    JSON.stringify(
      safeAccount
    )
  );


  localStorage.setItem(
    STORAGE_KEYS.savedLogin,
    JSON.stringify({
      username:
        safeAccount.username
    })
  );
}


function saveLocalLingoData(
  userData
) {
  localStorage.setItem(
    STORAGE_KEYS.data,
    JSON.stringify([
      userData
    ])
  );
}


function saveSession(
  account
) {
  localStorage.setItem(
    STORAGE_KEYS.session,
    account.user_idx
  );

  saveLocalAccount(
    account
  );
}


function clearSession() {
  localStorage.removeItem(
    STORAGE_KEYS.session
  );

  localStorage.removeItem(
    STORAGE_KEYS.currentRoom
  );

  localStorage.removeItem(
    STORAGE_KEYS.account
  );

  localStorage.removeItem(
    STORAGE_KEYS.users
  );

  localStorage.removeItem(
    STORAGE_KEYS.data
  );
}



/*
==================================================
ACCOUNT LOOKUP
==================================================
*/

async function findAccountByUsername(
  username
) {
  const accountQuery =
    query(
      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "username",
        "==",
        username
      ),

      limit(1)
    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (snapshot.empty) {
    return null;
  }


  const document =
    snapshot.docs[0];


  return {
    documentId:
      document.id,

    ...document.data()
  };
}


async function findAccountByEmail(
  email
) {
  const accountQuery =
    query(
      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "email",
        "==",
        email
      ),

      limit(1)
    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (snapshot.empty) {
    return null;
  }


  const document =
    snapshot.docs[0];


  return {
    documentId:
      document.id,

    ...document.data()
  };
}


async function findAccountByUserIdx(
  userIdx
) {

  /*
  First try user_idx as document ID.
  */

  const directReference =
    doc(
      database,
      COLLECTIONS.accounts,
      userIdx
    );


  const directSnapshot =
    await getDoc(
      directReference
    );


  if (
    directSnapshot.exists()
  ) {
    return {
      documentId:
        directSnapshot.id,

      ...directSnapshot.data()
    };
  }


  /*
  Support older account documents
  where document ID was different.
  */

  const accountQuery =
    query(
      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "user_idx",
        "==",
        userIdx
      ),

      limit(1)
    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (snapshot.empty) {
    return null;
  }


  const document =
    snapshot.docs[0];


  return {
    documentId:
      document.id,

    ...document.data()
  };
}



/*
==================================================
REGISTER
==================================================
*/

async function registerUser(
  details
) {
  const name =
    String(
      details.name || ""
    ).trim();


  const username =
    String(
      details.username || ""
    ).trim();


  const email =
    String(
      details.email || ""
    ).trim();


  const password =
    String(
      details.password || ""
    );


  if (
    !name ||
    !username ||
    !email ||
    !password
  ) {
    throw new Error(
      "Complete all registration fields."
    );
  }


  /*
  Check username.
  */

  const existingUsername =
    await findAccountByUsername(
      username
    );


  if (existingUsername) {
    throw new Error(
      "That username already exists."
    );
  }


  /*
  Check email.
  */

  const existingEmail =
    await findAccountByEmail(
      email
    );


  if (existingEmail) {
    throw new Error(
      "An account already uses that email."
    );
  }


  const userIdx =
    createId("user");


  const accountData = {
    name:
      name,

    email:
      email,

    username:
      username,

    /*
    Tutorial only.

    A production application should
    use Firebase Authentication instead
    of storing passwords in Firestore.
    */

    password:
      password,

    user_idx:
      userIdx,

    website:
      "",

    experience:
      0,

    profile_pic:
      "",

    cv:
      "",

    createdAt:
      new Date()
        .toISOString()
  };


  /*
  Create account.
  */

  await setDoc(
    doc(
      database,
      COLLECTIONS.accounts,
      userIdx
    ),

    accountData
  );


  /*
  Create empty LingoGPT data.
  */

  const lingoData = {
    user_idx:
      userIdx,

    username:
      username,

    rooms: [],

    updatedAt:
      new Date()
        .toISOString()
  };


  await setDoc(
    doc(
      database,
      COLLECTIONS.lingo,
      userIdx
    ),

    lingoData
  );


  saveSession(
    accountData
  );


  saveLocalLingoData(
    lingoData
  );


  return accountData;
}



/*
==================================================
LOGIN
==================================================
*/

async function loginUser(
  username,
  password
) {
  username =
    String(
      username || ""
    ).trim();


  password =
    String(
      password || ""
    );


  if (
    !username ||
    !password
  ) {
    throw new Error(
      "Enter your username and password."
    );
  }


  const account =
    await findAccountByUsername(
      username
    );


  if (!account) {
    throw new Error(
      "Username was not found."
    );
  }


  /*
  Simple educational password check.
  */

  if (
    String(
      account.password
    ) !== password
  ) {
    throw new Error(
      "Password is incorrect."
    );
  }


  const userIdx =
    account.user_idx ||
    account.documentId;


  account.user_idx =
    userIdx;


  saveSession(
    account
  );


  /*
  Download their rooms/chats.
  */

  await loadUserData(
    userIdx
  );


  return account;
}



/*
==================================================
LOAD USER LINGO DATA
==================================================
*/

async function loadUserData(
  userIdx = getSessionUserIdx()
) {
  if (!userIdx) {
    return null;
  }


  const reference =
    doc(
      database,
      COLLECTIONS.lingo,
      userIdx
    );


  const snapshot =
    await getDoc(
      reference
    );


  /*
  First login for an account that
  existed before lingo_Data.
  */

  if (!snapshot.exists()) {
    const account =
      await findAccountByUserIdx(
        userIdx
      );


    if (!account) {
      return null;
    }


    const initialData = {
      user_idx:
        userIdx,

      username:
        account.username,

      rooms: [],

      updatedAt:
        new Date()
          .toISOString()
    };


    await setDoc(
      reference,
      initialData
    );


    saveLocalLingoData(
      initialData
    );


    return initialData;
  }


  const data =
    snapshot.data();


  if (
    !Array.isArray(
      data.rooms
    )
  ) {
    data.rooms = [];
  }


  saveLocalLingoData(
    data
  );


  return data;
}



/*
==================================================
SAVE COMPLETE USER DATA

welcome.html and index.html can call this
after rooms/chats change.
==================================================
*/

async function saveUserData(
  userData
) {
  if (
    !userData ||
    !userData.user_idx
  ) {
    throw new Error(
      "Cannot save user data."
    );
  }


  const data =
    clone(
      userData
    );


  data.updatedAt =
    new Date()
      .toISOString();


  await setDoc(
    doc(
      database,
      COLLECTIONS.lingo,
      data.user_idx
    ),

    data
  );


  saveLocalLingoData(
    data
  );


  return data;
}



/*
==================================================
CURRENT USER
==================================================
*/

async function getCurrentUser() {
  const userIdx =
    getSessionUserIdx();


  if (!userIdx) {
    return null;
  }


  const account =
    await findAccountByUserIdx(
      userIdx
    );


  if (!account) {
    clearSession();

    return null;
  }


  account.user_idx =
    account.user_idx ||
    account.documentId;


  saveLocalAccount(
    account
  );


  return account;
}



/*
==================================================
CURRENT USER DATA
==================================================
*/

async function getCurrentUserData() {
  const userIdx =
    getSessionUserIdx();


  if (!userIdx) {
    return null;
  }


  return await loadUserData(
    userIdx
  );
}



/*
==================================================
ROOM HELPERS
==================================================
*/

async function getRooms() {
  const userData =
    await getCurrentUserData();


  if (!userData) {
    return [];
  }


  return Array.isArray(
    userData.rooms
  )
    ? userData.rooms
    : [];
}


async function getCurrentRoom() {
  const roomIdx =
    getCurrentRoomIdx();


  if (!roomIdx) {
    return null;
  }


  const rooms =
    await getRooms();


  return rooms.find(
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
CREATE ROOM
==================================================
*/

async function createRoom(
  roomName,
  sourceLanguage,
  targetLanguage
) {
  roomName =
    String(
      roomName || ""
    ).trim();


  if (!roomName) {
    throw new Error(
      "Enter a room name."
    );
  }


  if (
    sourceLanguage ===
    targetLanguage
  ) {
    throw new Error(
      "Choose different source and target languages."
    );
  }


  const userData =
    await getCurrentUserData();


  if (!userData) {
    throw new Error(
      "No logged-in user."
    );
  }


  const room = {
    room_idx:
      createId("room"),

    room_name:
      roomName,

    source_language:
      sourceLanguage,

    target_language:
      targetLanguage,

    room_data: [],

    createdAt:
      new Date()
        .toISOString()
  };


  userData.rooms.push(
    room
  );


  await saveUserData(
    userData
  );


  return room;
}



/*
==================================================
DELETE ROOM
==================================================
*/

async function deleteRoom(
  roomIdx
) {
  const userData =
    await getCurrentUserData();


  if (!userData) {
    return false;
  }


  userData.rooms =
    userData.rooms.filter(
      function(room) {
        return (
          room.room_idx !==
          roomIdx
        );
      }
    );


  await saveUserData(
    userData
  );


  if (
    getCurrentRoomIdx() ===
    roomIdx
  ) {
    localStorage.removeItem(
      STORAGE_KEYS.currentRoom
    );
  }


  return true;
}



/*
==================================================
SELECT ROOM
==================================================
*/

function selectRoom(
  roomIdx
) {
  localStorage.setItem(
    STORAGE_KEYS.currentRoom,
    roomIdx
  );
}



/*
==================================================
SAVE CHAT
==================================================

If chat_idx already exists:
update it.

Otherwise:
add a new chat.
==================================================
*/

async function saveChat(
  roomIdx,
  chatData
) {
  const userData =
    await getCurrentUserData();


  if (!userData) {
    throw new Error(
      "No logged-in user."
    );
  }


  const room =
    userData.rooms.find(
      function(item) {
        return (
          item.room_idx ===
          roomIdx
        );
      }
    );


  if (!room) {
    throw new Error(
      "Room was not found."
    );
  }


  if (
    !Array.isArray(
      room.room_data
    )
  ) {
    room.room_data = [];
  }


  const chat = {
    ...clone(chatData)
  };


  if (!chat.chat_idx) {
    chat.chat_idx =
      createId("chat");
  }


  const existingIndex =
    room.room_data.findIndex(
      function(item) {
        return (
          item.chat_idx ===
          chat.chat_idx
        );
      }
    );


  if (
    existingIndex === -1
  ) {
    room.room_data.push(
      chat
    );

  } else {
    room.room_data[
      existingIndex
    ] = chat;
  }


  await saveUserData(
    userData
  );


  return chat;
}



/*
==================================================
DELETE CHAT
==================================================
*/

async function deleteChat(
  roomIdx,
  chatIdx
) {
  const userData =
    await getCurrentUserData();


  if (!userData) {
    return false;
  }


  const room =
    userData.rooms.find(
      function(item) {
        return (
          item.room_idx ===
          roomIdx
        );
      }
    );


  if (!room) {
    return false;
  }


  room.room_data =
    room.room_data.filter(
      function(chat) {
        return (
          chat.chat_idx !==
          chatIdx
        );
      }
    );


  await saveUserData(
    userData
  );


  return true;
}



/*
==================================================
LOGOUT
==================================================
*/

function logout() {
  clearSession();

  window.location.href =
    "loginregister.html";
}



/*
==================================================
LOGINREGISTER.HTML
==================================================
*/

function setupLoginPage() {
  const loginForm =
    document.getElementById(
      "loginForm"
    );


  const registerForm =
    document.getElementById(
      "registerForm"
    );


  /*
  Not loginregister.html.
  Nothing to set up.
  */

  if (
    !loginForm &&
    !registerForm
  ) {
    return;
  }



  /*
  ------------------------------
  LOGIN
  ------------------------------
  */

  if (loginForm) {
    loginForm.addEventListener(
      "submit",

      async function(event) {
        event.preventDefault();


        const username =
          document
            .getElementById(
              "loginUsername"
            )
            .value
            .trim();


        const password =
          document
            .getElementById(
              "loginPassword"
            )
            .value;


        const button =
          document.getElementById(
            "loginButton"
          );


        button.disabled =
          true;

        button.textContent =
          "Logging in...";


        showMessage(
          "Checking account..."
        );


        try {
          await loginUser(
            username,
            password
          );


          showMessage(
            "Login successful.",
            "success"
          );


          window.location.href =
            "welcome.html";

        } catch (error) {
          console.error(
            error
          );


          showMessage(
            error.message ||
            "Login failed.",
            "error"
          );

        } finally {
          button.disabled =
            false;

          button.textContent =
            "Login";
        }
      }
    );
  }



  /*
  ------------------------------
  REGISTER
  ------------------------------
  */

  if (registerForm) {
    registerForm.addEventListener(
      "submit",

      async function(event) {
        event.preventDefault();


        const name =
          document
            .getElementById(
              "registerName"
            )
            .value
            .trim();


        const username =
          document
            .getElementById(
              "registerUsername"
            )
            .value
            .trim();


        const email =
          document
            .getElementById(
              "registerEmail"
            )
            .value
            .trim();


        const password =
          document
            .getElementById(
              "registerPassword"
            )
            .value;


        const confirmPassword =
          document
            .getElementById(
              "confirmPassword"
            )
            .value;


        if (
          password !==
          confirmPassword
        ) {
          showMessage(
            "The passwords do not match.",
            "error"
          );

          return;
        }


        const button =
          document.getElementById(
            "registerButton"
          );


        button.disabled =
          true;

        button.textContent =
          "Creating account...";


        showMessage(
          "Creating account..."
        );


        try {
          await registerUser({
            name:
              name,

            username:
              username,

            email:
              email,

            password:
              password
          });


          showMessage(
            "Account created successfully.",
            "success"
          );


          window.location.href =
            "welcome.html";

        } catch (error) {
          console.error(
            error
          );


          showMessage(
            error.message ||
            "Registration failed.",
            "error"
          );

        } finally {
          button.disabled =
            false;

          button.textContent =
            "Create Account";
        }
      }
    );
  }



  /*
  Fill saved username.
  */

  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEYS.savedLogin
        ) ||
        "null"
      );


    if (
      saved &&
      saved.username &&
      document.getElementById(
        "loginUsername"
      )
    ) {
      document.getElementById(
        "loginUsername"
      ).value =
        saved.username;
    }

  } catch (error) {
    console.warn(
      error
    );
  }
}



/*
==================================================
SYNC

Useful when welcome.html or index.html
starts.

Example:

await LingoFirebase.sync();
==================================================
*/

async function sync() {
  const user =
    await getCurrentUser();


  if (!user) {
    return null;
  }


  const userData =
    await getCurrentUserData();


  return {
    user:
      user,

    data:
      userData
  };
}



/*
==================================================
GLOBAL API

welcome.html and index.html can use:

LingoFirebase.createRoom(...)
LingoFirebase.getRooms()
LingoFirebase.saveChat(...)
etc.
==================================================
*/

window.LingoFirebase =
  Object.freeze({

    database:
      database,


    /*
    Account
    */

    registerUser:
      registerUser,

    loginUser:
      loginUser,

    logout:
      logout,

    getCurrentUser:
      getCurrentUser,

    getSessionUserIdx:
      getSessionUserIdx,


    /*
    Sync
    */

    sync:
      sync,

    loadUserData:
      loadUserData,

    getCurrentUserData:
      getCurrentUserData,

    saveUserData:
      saveUserData,


    /*
    Rooms
    */

    getRooms:
      getRooms,

    getCurrentRoom:
      getCurrentRoom,

    getCurrentRoomIdx:
      getCurrentRoomIdx,

    createRoom:
      createRoom,

    deleteRoom:
      deleteRoom,

    selectRoom:
      selectRoom,


    /*
    Chats
    */

    saveChat:
      saveChat,

    deleteChat:
      deleteChat
  });



/*
==================================================
START LOGIN PAGE

Because this module is loaded on all pages,
this function only does something when the
login/register forms actually exist.
==================================================
*/

setupLoginPage();