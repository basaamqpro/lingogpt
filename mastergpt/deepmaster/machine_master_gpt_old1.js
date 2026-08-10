// ============================================================
// machine_master_gpt.js
// ============================================================
//
// MASTER LANGUAGE - MAIN COORDINATOR / ENGINE
//
// THIS FILE DOES NOT TEACH LANGUAGES.
//
// OpenAI decides:
// - what to teach
// - how to teach
// - translations
// - explanations
// - examples
// - grammar
// - pronunciation
// - exercises
// - dialogue
// - next logical lesson content
//
// THIS FILE ONLY:
// - manages rooms
// - manages learner settings
// - tracks current Standard / Lesson / Part
// - loads the correct lesson JSON blueprint
// - loads saved progress
// - sends information to prepare_&_translate_for_gptapicall.js
// - sends the finished prompt to gpt_api_call.js
// - saves GPT responses
// - handles Next / Previous
// - stores chats
// - restores old generated lessons
//
// ============================================================


// ============================================================
// IMPORTS
// ============================================================

// This file prepares the final prompt.
// It decides how all information should be arranged for GPT.
//
// IMPORTANT:
// It does NOT call OpenAI itself.
import {
    prepareLessonPrompt
} from "./prepare_&_translate_for_gptapicall.js";


// This file ONLY communicates with our backend/OpenAI API.
import {
    callGPT
} from "./gpt_api_call.js";



// ============================================================
// CONFIGURATION
// ============================================================

const MASTER_LANGUAGE_CONFIG = {

    // Change this one place if JSON folders move later.
    curriculumBasePath: "./standards",

    totalStandards: 10,

    totalLessons: 50,

    storageKeys: {
        rooms: "master_language_rooms",
        currentRoom: "master_language_current_room"
    }

};



// ============================================================
// MASTER LANGUAGE ENGINE
// ============================================================

class MachineMasterGPT {

    constructor() {

        this.rooms = {};

        this.currentRoomId = null;

        this.currentRoom = null;

        this.currentBlueprint = null;

    }



    // ========================================================
    // INITIALIZE ENGINE
    // ========================================================

    async init() {

        this.loadRoomsFromStorage();

        this.loadCurrentRoomId();

        if (this.currentRoomId) {

            this.currentRoom =
                this.rooms[this.currentRoomId] || null;

        }

        return {
            rooms: this.rooms,
            currentRoomId: this.currentRoomId,
            currentRoom: this.currentRoom
        };

    }



    // ========================================================
    // ROOM CREATION
    // ========================================================

    createRoom({

        sourceLanguage,
        targetLanguage,
        roomName = null,
        startingStandard = 1,
        startingLesson = 1

    }) {

        if (!sourceLanguage) {
            throw new Error("sourceLanguage is required.");
        }

        if (!targetLanguage) {
            throw new Error("targetLanguage is required.");
        }


        const roomId = this.generateRoomId();


        const room = {

            // ------------------------------------------------
            // BASIC ROOM INFORMATION
            // ------------------------------------------------

            roomId,

            roomName:
                roomName ||
                `${targetLanguage} from ${sourceLanguage}`,

            sourceLanguage,

            targetLanguage,


            // ------------------------------------------------
            // CURRENT COURSE POSITION
            // ------------------------------------------------

            progress: {

                standard: startingStandard,

                lesson: startingLesson,

                part: 1,

                partGroup: 1

            },


            // ------------------------------------------------
            // GENERATED LESSON PARTS
            //
            // Example:
            //
            // generatedLessons: {
            //     "1.1": {...},
            //     "1.2": {...},
            //     "1.3": {...}
            // }
            // ------------------------------------------------

            generatedLessons: {},


            // ------------------------------------------------
            // ORDER OF GENERATED PARTS
            //
            // Useful for Previous / Next.
            //
            // Example:
            //
            // ["1.1", "1.2", "1.3"]
            // ------------------------------------------------

            lessonHistory: [],


            // ------------------------------------------------
            // COMPLETED PARTS
            // ------------------------------------------------

            completedParts: [],


            // ------------------------------------------------
            // COMPLETED MAIN LESSONS
            // ------------------------------------------------

            completedLessons: [],


            // ------------------------------------------------
            // GPT KNOWLEDGE MEMORY
            //
            // machine_master_gpt.js does NOT decide these.
            //
            // GPT returns knowledge updates.
            // We simply save them.
            // ------------------------------------------------

            knowledge: {

                vocabulary: [],

                expressions: [],

                grammar: [],

                pronunciation: [],

                concepts: [],

                commonMistakes: []

            },


            // ------------------------------------------------
            // COMPACT LESSON SUMMARIES
            //
            // We can send these to GPT rather than sending
            // every complete old lesson.
            // ------------------------------------------------

            lessonSummaries: [],


            // ------------------------------------------------
            // CHAT WITH AI TEACHER
            // ------------------------------------------------

            chatHistory: [],


            // ------------------------------------------------
            // PROMPTS
            //
            // Useful for debugging and restoring history.
            // ------------------------------------------------

            promptHistory: [],


            // ------------------------------------------------
            // ROOM INFORMATION
            // ------------------------------------------------

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        };


        this.rooms[roomId] = room;

        this.currentRoomId = roomId;

        this.currentRoom = room;


        this.saveRoomsToStorage();

        this.saveCurrentRoomId();


        return room;

    }



    // ========================================================
    // OPEN EXISTING ROOM
    // ========================================================

    openRoom(roomId) {

        const room = this.rooms[roomId];

        if (!room) {
            throw new Error(
                `Room "${roomId}" does not exist.`
            );
        }

        this.currentRoomId = roomId;

        this.currentRoom = room;

        this.saveCurrentRoomId();

        return room;

    }



    // ========================================================
    // GET ALL ROOMS
    // ========================================================

    getRooms() {

        return Object.values(this.rooms);

    }



    // ========================================================
    // GET CURRENT ROOM
    // ========================================================

    getCurrentRoom() {

        return this.currentRoom;

    }



    // ========================================================
    // DELETE ROOM
    // ========================================================

    deleteRoom(roomId) {

        if (!this.rooms[roomId]) {
            return false;
        }


        delete this.rooms[roomId];


        if (this.currentRoomId === roomId) {

            this.currentRoomId = null;

            this.currentRoom = null;

            localStorage.removeItem(
                MASTER_LANGUAGE_CONFIG
                    .storageKeys
                    .currentRoom
            );

        }


        this.saveRoomsToStorage();

        return true;

    }



    // ========================================================
    // LOAD CURRENT LESSON BLUEPRINT
    // ========================================================

    async loadCurrentLessonBlueprint() {

        this.requireCurrentRoom();


        const standard =
            this.currentRoom.progress.standard;

        const lesson =
            this.currentRoom.progress.lesson;


        const standardFolder =
            `standard_${String(standard).padStart(2, "0")}`;

        const lessonFile =
            `lesson${String(lesson).padStart(2, "0")}.json`;


        const path =
            `${MASTER_LANGUAGE_CONFIG.curriculumBasePath}/` +
            `${standardFolder}/` +
            `${lessonFile}`;


        const response = await fetch(path);


        if (!response.ok) {

            throw new Error(
                `Could not load curriculum blueprint: ${path}`
            );

        }


        const blueprint = await response.json();


        this.currentBlueprint = blueprint;


        return blueprint;

    }



    // ========================================================
    // GENERATE CURRENT LESSON PART
    // ========================================================

    async generateCurrentPart({

        forceRegenerate = false

    } = {}) {

        this.requireCurrentRoom();


        const room = this.currentRoom;


        const lesson =
            room.progress.lesson;

        const part =
            room.progress.part;


        const partId =
            `${lesson}.${part}`;



        // ====================================================
        // STEP 1
        // CHECK IF GPT ALREADY GENERATED THIS PART
        // ====================================================

        if (
            !forceRegenerate &&
            room.generatedLessons[partId]
        ) {

            return {

                fromCache: true,

                partId,

                lesson:
                    room.generatedLessons[partId]

            };

        }



        // ====================================================
        // STEP 2
        // LOAD THE CORRECT CURRICULUM JSON
        // ====================================================

        const blueprint =
            await this.loadCurrentLessonBlueprint();



        // ====================================================
        // STEP 3
        // BUILD CONTEXT FOR PROMPT PREPARER
        //
        // IMPORTANT:
        //
        // We are NOT deciding what GPT should teach.
        //
        // We simply collect the information GPT needs.
        // ====================================================

        const lessonContext = {

            learner: {

                sourceLanguage:
                    room.sourceLanguage,

                targetLanguage:
                    room.targetLanguage

            },


            position: {

                standard:
                    room.progress.standard,

                lesson:
                    room.progress.lesson,

                part:
                    room.progress.part,

                partGroup:
                    room.progress.partGroup

            },


            curriculum: blueprint,


            knowledge:
                room.knowledge,


            completedParts:
                room.completedParts,


            completedLessons:
                room.completedLessons,


            previousLessonSummaries:
                room.lessonSummaries,


            recentChat:
                this.getRecentChat(10),


            generatedLessonIds:
                Object.keys(
                    room.generatedLessons
                )

        };



        // ====================================================
        // STEP 4
        // SEND EVERYTHING TO PROMPT PREPARER
        //
        // This file creates the final perfect GPT prompt.
        // ====================================================

        const preparedPrompt =
            await prepareLessonPrompt(
                lessonContext
            );



        // ====================================================
        // STEP 5
        // SAVE PROMPT HISTORY
        // ====================================================

        this.savePrompt({

            type: "lesson_generation",

            lesson:
                room.progress.lesson,

            part:
                room.progress.part,

            prompt:
                preparedPrompt

        });



        // ====================================================
        // STEP 6
        // CALL OPENAI
        //
        // machine_master_gpt.js DOES NOT know
        // how GPT generates the lesson.
        //
        // It only sends the prepared prompt.
        // ====================================================

        const generatedLesson =
            await callGPT(
                preparedPrompt
            );



        // ====================================================
        // STEP 7
        // SAVE GENERATED LESSON
        // ====================================================

        this.saveGeneratedLesson(
            partId,
            generatedLesson
        );



        // ====================================================
        // STEP 8
        // SAVE ANY KNOWLEDGE GPT RETURNED
        // ====================================================

        this.applyGPTKnowledgeUpdate(
            generatedLesson
        );



        // ====================================================
        // STEP 9
        // SAVE GPT LESSON SUMMARY IF PROVIDED
        // ====================================================

        this.applyGPTLessonSummary(
            generatedLesson,
            partId
        );



        // ====================================================
        // STEP 10
        // SAVE GPT PROGRESS RECOMMENDATION
        // ====================================================

        this.applyGPTProgressRecommendation(
            generatedLesson
        );



        this.touchRoom();

        this.saveRoomsToStorage();



        // ====================================================
        // RETURN TO index.html
        // ====================================================

        return {

            fromCache: false,

            partId,

            lesson:
                generatedLesson

        };

    }



    // ========================================================
    // SAVE GENERATED LESSON
    // ========================================================

    saveGeneratedLesson(
        partId,
        lessonData
    ) {

        const room = this.currentRoom;


        room.generatedLessons[partId] =
            lessonData;


        if (
            !room.lessonHistory.includes(
                partId
            )
        ) {

            room.lessonHistory.push(
                partId
            );

        }


        this.saveRoomsToStorage();

    }



    // ========================================================
    // GET SAVED LESSON
    // ========================================================

    getSavedLesson(partId) {

        this.requireCurrentRoom();


        return (
            this.currentRoom
                .generatedLessons[partId]
            || null
        );

    }



    // ========================================================
    // GET CURRENT SAVED PART
    // ========================================================

    getCurrentSavedPart() {

        this.requireCurrentRoom();


        const lesson =
            this.currentRoom.progress.lesson;

        const part =
            this.currentRoom.progress.part;


        const partId =
            `${lesson}.${part}`;


        return this.getSavedLesson(
            partId
        );

    }



    // ========================================================
    // COMPLETE CURRENT PART
    // ========================================================

    completeCurrentPart() {

        this.requireCurrentRoom();


        const room = this.currentRoom;


        const partId =
            `${room.progress.lesson}.${room.progress.part}`;


        if (
            !room.completedParts.includes(
                partId
            )
        ) {

            room.completedParts.push(
                partId
            );

        }


        this.touchRoom();

        this.saveRoomsToStorage();


        return partId;

    }



    // ========================================================
    // NEXT PART
    // ========================================================

    async nextPart() {

        this.requireCurrentRoom();


        // Mark current part completed.
        this.completeCurrentPart();


        // Increase ONLY the part number.
        //
        // We are NOT deciding lesson content here.
        this.currentRoom.progress.part += 1;


        this.touchRoom();

        this.saveRoomsToStorage();


        // If it already exists, this returns saved data.
        //
        // Otherwise GPT generates it.
        return await this.generateCurrentPart();

    }



    // ========================================================
    // PREVIOUS PART
    // ========================================================

    previousPart() {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        if (room.progress.part <= 1) {

            return null;

        }


        room.progress.part -= 1;


        this.touchRoom();

        this.saveRoomsToStorage();


        const partId =
            `${room.progress.lesson}.${room.progress.part}`;


        return {

            partId,

            lesson:
                room.generatedLessons[partId]
                || null

        };

    }



    // ========================================================
    // GO TO SPECIFIC PART
    // ========================================================

    goToPart(partNumber) {

        this.requireCurrentRoom();


        if (
            !Number.isInteger(partNumber) ||
            partNumber < 1
        ) {

            throw new Error(
                "Invalid part number."
            );

        }


        this.currentRoom.progress.part =
            partNumber;


        this.touchRoom();

        this.saveRoomsToStorage();


        return this.getCurrentSavedPart();

    }



    // ========================================================
    // MOVE TO NEXT MAIN LESSON
    //
    // IMPORTANT:
    //
    // This is called by the application when we WANT to
    // advance.
    //
    // GPT may recommend completion,
    // but GPT does not directly change our lesson number.
    // ========================================================

    async nextLesson() {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        const currentLesson =
            room.progress.lesson;



        if (
            !room.completedLessons.includes(
                currentLesson
            )
        ) {

            room.completedLessons.push(
                currentLesson
            );

        }



        room.progress.lesson += 1;

        room.progress.part = 1;

        room.progress.partGroup = 1;



        // ----------------------------------------------------
        // Standard calculation
        //
        // In this current design:
        //
        // 5 lessons per Standard
        //
        // Lessons 1-5   = Standard 1
        // Lessons 6-10  = Standard 2
        // etc.
        // ----------------------------------------------------

        room.progress.standard =
            Math.ceil(
                room.progress.lesson / 5
            );



        this.touchRoom();

        this.saveRoomsToStorage();


        return await this.generateCurrentPart();

    }



    // ========================================================
    // GO TO SPECIFIC MAIN LESSON
    // ========================================================

    async goToLesson(
        lessonNumber
    ) {

        this.requireCurrentRoom();


        if (
            lessonNumber < 1 ||
            lessonNumber >
                MASTER_LANGUAGE_CONFIG
                    .totalLessons
        ) {

            throw new Error(
                "Invalid lesson number."
            );

        }


        const room =
            this.currentRoom;


        room.progress.lesson =
            lessonNumber;

        room.progress.part = 1;

        room.progress.partGroup = 1;


        room.progress.standard =
            Math.ceil(
                lessonNumber / 5
            );


        this.touchRoom();

        this.saveRoomsToStorage();


        return await this.generateCurrentPart();

    }



    // ========================================================
    // GPT KNOWLEDGE UPDATE
    //
    // IMPORTANT:
    //
    // GPT decides what was taught.
    //
    // This function ONLY stores what GPT says was taught.
    // ========================================================

    applyGPTKnowledgeUpdate(
        generatedLesson
    ) {

        if (!generatedLesson) {
            return;
        }


        const update =
            generatedLesson
                .knowledge_update;


        if (!update) {
            return;
        }


        const room =
            this.currentRoom;



        this.mergeUniqueValues(

            room.knowledge.vocabulary,

            update.vocabulary_introduced

        );


        this.mergeUniqueValues(

            room.knowledge.expressions,

            update.expressions_introduced

        );


        this.mergeUniqueValues(

            room.knowledge.grammar,

            update.grammar_introduced

        );


        this.mergeUniqueValues(

            room.knowledge.pronunciation,

            update.pronunciation_introduced

        );


        this.mergeUniqueValues(

            room.knowledge.concepts,

            update.concepts_reviewed

        );


        this.saveRoomsToStorage();

    }



    // ========================================================
    // GPT LESSON SUMMARY
    // ========================================================

    applyGPTLessonSummary(
        generatedLesson,
        partId
    ) {

        if (!generatedLesson) {
            return;
        }


        const summary =
            generatedLesson
                .lesson_summary;


        if (!summary) {
            return;
        }


        const existingIndex =
            this.currentRoom
                .lessonSummaries
                .findIndex(
                    item =>
                        item.partId === partId
                );


        const record = {

            partId,

            summary,

            createdAt:
                new Date().toISOString()

        };


        if (existingIndex >= 0) {

            this.currentRoom
                .lessonSummaries[
                    existingIndex
                ] = record;

        } else {

            this.currentRoom
                .lessonSummaries
                .push(record);

        }


        this.saveRoomsToStorage();

    }



    // ========================================================
    // SAVE GPT PROGRESS RECOMMENDATION
    //
    // Example GPT might return:
    //
    // progress_recommendation: {
    //     lesson_target_coverage: 45,
    //     recommended_next_part_group: 2,
    //     ready_to_complete_lesson: false
    // }
    //
    // We save it.
    //
    // We do NOT automatically obey it here.
    // ========================================================

    applyGPTProgressRecommendation(
        generatedLesson
    ) {

        const recommendation =
            generatedLesson
                ?.progress_recommendation;


        if (!recommendation) {
            return;
        }


        this.currentRoom
            .lastProgressRecommendation =
                recommendation;


        this.saveRoomsToStorage();

    }



    // ========================================================
    // GET LAST GPT PROGRESS RECOMMENDATION
    // ========================================================

    getProgressRecommendation() {

        this.requireCurrentRoom();


        return (
            this.currentRoom
                .lastProgressRecommendation
            || null
        );

    }



    // ========================================================
    // UPDATE PART GROUP
    //
    // GPT can recommend which group should come next.
    //
    // machine_master_gpt.js only stores the position.
    // ========================================================

    setPartGroup(
        partGroup
    ) {

        this.requireCurrentRoom();


        this.currentRoom
            .progress
            .partGroup =
                partGroup;


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // CHAT
    // ========================================================

    saveChatMessage({

        role,
        content,
        lesson = null,
        part = null

    }) {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        room.chatHistory.push({

            id:
                this.generateId(
                    "chat"
                ),

            role,

            content,

            lesson:
                lesson ??
                room.progress.lesson,

            part:
                part ??
                room.progress.part,

            createdAt:
                new Date().toISOString()

        });


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // GET RECENT CHAT
    // ========================================================

    getRecentChat(
        amount = 10
    ) {

        this.requireCurrentRoom();


        return this.currentRoom
            .chatHistory
            .slice(-amount);

    }



    // ========================================================
    // CLEAR CHAT
    // ========================================================

    clearChat() {

        this.requireCurrentRoom();


        this.currentRoom
            .chatHistory = [];


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // SAVE PROMPT
    // ========================================================

    savePrompt({

        type,
        lesson,
        part,
        prompt

    }) {

        this.requireCurrentRoom();


        this.currentRoom
            .promptHistory
            .push({

                id:
                    this.generateId(
                        "prompt"
                    ),

                type,

                lesson,

                part,

                prompt,

                createdAt:
                    new Date()
                        .toISOString()

            });


        this.saveRoomsToStorage();

    }



    // ========================================================
    // GET PROMPT HISTORY
    // ========================================================

    getPromptHistory() {

        this.requireCurrentRoom();


        return this.currentRoom
            .promptHistory;

    }



    // ========================================================
    // MERGE GPT KNOWLEDGE
    //
    // No intelligence here.
    //
    // Just avoids duplicate saved strings.
    // ========================================================

    mergeUniqueValues(
        destination,
        incoming
    ) {

        if (!Array.isArray(incoming)) {
            return;
        }


        for (const item of incoming) {

            if (
                item === null ||
                item === undefined
            ) {

                continue;

            }


            const exists =
                destination.some(
                    existing =>
                        JSON.stringify(existing) ===
                        JSON.stringify(item)
                );


            if (!exists) {

                destination.push(
                    item
                );

            }

        }

    }



    // ========================================================
    // CURRENT COURSE POSITION
    // ========================================================

    getCurrentPosition() {

        this.requireCurrentRoom();


        return {

            standard:
                this.currentRoom
                    .progress.standard,

            lesson:
                this.currentRoom
                    .progress.lesson,

            part:
                this.currentRoom
                    .progress.part,

            partGroup:
                this.currentRoom
                    .progress.partGroup

        };

    }



    // ========================================================
    // UPDATE LEARNER LANGUAGES
    // ========================================================

    updateLanguages({

        sourceLanguage,
        targetLanguage

    }) {

        this.requireCurrentRoom();


        if (sourceLanguage) {

            this.currentRoom
                .sourceLanguage =
                    sourceLanguage;

        }


        if (targetLanguage) {

            this.currentRoom
                .targetLanguage =
                    targetLanguage;

        }


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // EXPORT ROOM DATA
    // ========================================================

    exportCurrentRoom() {

        this.requireCurrentRoom();


        return JSON.parse(
            JSON.stringify(
                this.currentRoom
            )
        );

    }



    // ========================================================
    // SAVE TO LOCAL STORAGE
    // ========================================================

    saveRoomsToStorage() {

        localStorage.setItem(

            MASTER_LANGUAGE_CONFIG
                .storageKeys.rooms,

            JSON.stringify(
                this.rooms
            )

        );

    }



    // ========================================================
    // LOAD ROOMS FROM LOCAL STORAGE
    // ========================================================

    loadRoomsFromStorage() {

        const saved =
            localStorage.getItem(

                MASTER_LANGUAGE_CONFIG
                    .storageKeys.rooms

            );


        if (!saved) {

            this.rooms = {};

            return;

        }


        try {

            this.rooms =
                JSON.parse(saved);

        } catch (error) {

            console.error(
                "Could not load Master Language rooms:",
                error
            );

            this.rooms = {};

        }

    }



    // ========================================================
    // SAVE CURRENT ROOM ID
    // ========================================================

    saveCurrentRoomId() {

        if (!this.currentRoomId) {
            return;
        }


        localStorage.setItem(

            MASTER_LANGUAGE_CONFIG
                .storageKeys.currentRoom,

            this.currentRoomId

        );

    }



    // ========================================================
    // LOAD CURRENT ROOM ID
    // ========================================================

    loadCurrentRoomId() {

        this.currentRoomId =
            localStorage.getItem(

                MASTER_LANGUAGE_CONFIG
                    .storageKeys.currentRoom

            );

    }



    // ========================================================
    // UPDATE ROOM MODIFIED TIME
    // ========================================================

    touchRoom() {

        if (!this.currentRoom) {
            return;
        }


        this.currentRoom.updatedAt =
            new Date().toISOString();

    }



    // ========================================================
    // REQUIRE ROOM
    // ========================================================

    requireCurrentRoom() {

        if (!this.currentRoom) {

            throw new Error(
                "No Master Language room is currently open."
            );

        }

    }



    // ========================================================
    // GENERATE ROOM ID
    // ========================================================

    generateRoomId() {

        return this.generateId(
            "room"
        );

    }



    // ========================================================
    // GENERIC ID GENERATOR
    // ========================================================

    generateId(prefix) {

        return (
            prefix +
            "_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 9)
        );

    }

}



// ============================================================
// CREATE SINGLE MASTER ENGINE
// ============================================================

const machineMasterGPT =
    new MachineMasterGPT();



// ============================================================
// EXPORT
// ============================================================

export {

    MachineMasterGPT,

    machineMasterGPT,

    MASTER_LANGUAGE_CONFIG

};