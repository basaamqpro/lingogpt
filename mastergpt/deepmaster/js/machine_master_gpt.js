// ============================================================
// machine_master_gpt.js
// ============================================================
//
// MASTER LANGUAGE - MAIN COORDINATOR
//
// IMPORTANT:
// THIS FILE DOES NOT TEACH LANGUAGES.
//
// OPENAI DOES THE INTELLIGENCE.
//
// This file only coordinates:
//
// - rooms
// - localStorage
// - source language
// - target language
// - current Standard
// - current Lesson
// - current Part
// - JSON curriculum loading
// - prompt preparation
// - GPT API calls
// - saving generated lessons
// - saving learner knowledge returned by GPT
// - Previous
// - Next
// - Teacher Chat
// - Practice
//
// ============================================================



// ============================================================
// IMPORT PROMPT PREPARERS
// ============================================================

import {

    prepareLessonPrompt,

    prepareTeacherChatPrompt,

    preparePracticePrompt

} from "./prepare_&_translate_for_gptapicall.js";



// ============================================================
// IMPORT GPT API CALL
// ============================================================

import {

    callGPT

} from "./gpt_api_call.js";



// ============================================================
// CONFIGURATION
// ============================================================

const MASTER_LANGUAGE_CONFIG = {

    curriculumBasePath: "./standards",

    totalStandards: 10,

    totalLessons: 50,

    lessonsPerStandard: 5,

    storageKeys: {

        rooms:
            "master_language_rooms",

        currentRoom:
            "master_language_current_room"

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
    // INITIALIZE
    // ========================================================

    async init() {

        this.loadRoomsFromStorage();

        this.loadCurrentRoomId();


        if (
            this.currentRoomId &&
            this.rooms[this.currentRoomId]
        ) {

            this.currentRoom =
                this.rooms[this.currentRoomId];

        }


        return {

            rooms:
                this.rooms,

            currentRoomId:
                this.currentRoomId,

            currentRoom:
                this.currentRoom

        };

    }



    // ========================================================
    // CREATE ROOM
    // ========================================================

    createRoom({

        sourceLanguage,

        targetLanguage,

        roomName = null,

        startingLesson = 1

    }) {

        if (!sourceLanguage) {

            throw new Error(
                "sourceLanguage is required."
            );

        }


        if (!targetLanguage) {

            throw new Error(
                "targetLanguage is required."
            );

        }


        if (
            startingLesson < 1 ||
            startingLesson >
                MASTER_LANGUAGE_CONFIG
                    .totalLessons
        ) {

            throw new Error(
                "Invalid starting lesson."
            );

        }


        const roomId =
            this.generateId("room");


        const standard =
            this.calculateStandard(
                startingLesson
            );


        const room = {

            // ------------------------------------------------
            // ROOM DETAILS
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

                standard,

                lesson:
                    startingLesson,

                part: 1,

                partGroup: 1

            },


            // ------------------------------------------------
            // ALL GENERATED LESSON PARTS
            //
            // Example:
            //
            // {
            //     "1.1": {...},
            //     "1.2": {...}
            // }
            // ------------------------------------------------

            generatedLessons: {},


            // ------------------------------------------------
            // ORDER LESSON PARTS WERE GENERATED
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
            // KNOWLEDGE
            //
            // GPT tells us what was introduced.
            //
            // We ONLY store it.
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
            // COMPACT SUMMARIES OF PREVIOUS LESSONS
            // ------------------------------------------------

            lessonSummaries: [],


            // ------------------------------------------------
            // LEARNER / TEACHER CHAT
            // ------------------------------------------------

            chatHistory: [],


            // ------------------------------------------------
            // PRACTICE HISTORY
            // ------------------------------------------------

            practiceHistory: [],


            // ------------------------------------------------
            // PROMPTS SENT TO GPT
            // ------------------------------------------------

            promptHistory: [],


            // ------------------------------------------------
            // LAST GPT PROGRESS RECOMMENDATION
            // ------------------------------------------------

            lastProgressRecommendation: null,


            // ------------------------------------------------
            // TIMES
            // ------------------------------------------------

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        this.rooms[roomId] = room;

        this.currentRoomId = roomId;

        this.currentRoom = room;


        this.saveRoomsToStorage();

        this.saveCurrentRoomId();


        return room;

    }



    // ========================================================
    // OPEN ROOM
    // ========================================================

    openRoom(roomId) {

        const room =
            this.rooms[roomId];


        if (!room) {

            throw new Error(
                `Room "${roomId}" does not exist.`
            );

        }


        this.currentRoomId =
            roomId;

        this.currentRoom =
            room;


        this.saveCurrentRoomId();


        return room;

    }



    // ========================================================
    // GET CURRENT ROOM
    // ========================================================

    getCurrentRoom() {

        return this.currentRoom;

    }



    // ========================================================
    // GET ALL ROOMS
    // ========================================================

    getRooms() {

        return Object.values(
            this.rooms
        );

    }



    // ========================================================
    // DELETE ROOM
    // ========================================================

    deleteRoom(roomId) {

        if (!this.rooms[roomId]) {

            return false;

        }


        delete this.rooms[roomId];


        if (
            this.currentRoomId === roomId
        ) {

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
    // CALCULATE STANDARD FROM LESSON
    // ========================================================

    calculateStandard(
        lessonNumber
    ) {

        return Math.ceil(

            lessonNumber /

            MASTER_LANGUAGE_CONFIG
                .lessonsPerStandard

        );

    }



    // ========================================================
    // LOAD CURRENT LESSON JSON
    // ========================================================

    async loadCurrentLessonBlueprint() {

        this.requireCurrentRoom();


        const standard =
            this.currentRoom
                .progress
                .standard;


        const lesson =
            this.currentRoom
                .progress
                .lesson;


        const standardFolder =

            `standard_${String(
                standard
            ).padStart(2, "0")}`;


        const lessonFile =

            `lesson${String(
                lesson
            ).padStart(2, "0")}.json`;


        const path =

            `${MASTER_LANGUAGE_CONFIG.curriculumBasePath}/` +

            `${standardFolder}/` +

            `${lessonFile}`;


        const response =
            await fetch(path);


        if (!response.ok) {

            throw new Error(

                `Could not load curriculum blueprint: ${path}`

            );

        }


        const blueprint =
            await response.json();


        this.currentBlueprint =
            blueprint;


        return blueprint;

    }



    // ========================================================
    // BUILD CONTEXT FOR PROMPT PREPARER
    // ========================================================
    //
    // This is important.
    //
    // All prompt types use the same basic information.
    //
    // machine_master_gpt.js does NOT interpret it.
    //
    // It simply collects it.
    // ========================================================

    async buildGPTContext() {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        const blueprint =
            await this.loadCurrentLessonBlueprint();


        return {

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


            curriculum:
                blueprint,


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
                ),


            // IMPORTANT:
            //
            // prepareTeacherChatPrompt()
            // can now see the complete current lesson.
            generatedLessons:
                room.generatedLessons

        };

    }



    // ========================================================
    // GENERATE CURRENT LESSON PART
    // ========================================================

    async generateCurrentPart({

        forceRegenerate = false

    } = {}) {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        const partId =
            this.getCurrentPartId();



        // ====================================================
        // CHECK LOCAL STORAGE FIRST
        // ====================================================

        if (
            !forceRegenerate &&
            room.generatedLessons[partId]
        ) {

            return {

                fromCache: true,

                partId,

                lesson:
                    room.generatedLessons[
                        partId
                    ]

            };

        }



        // ====================================================
        // BUILD GPT CONTEXT
        // ====================================================

        const context =
            await this.buildGPTContext();



        // ====================================================
        // PREPARE PROMPT
        // ====================================================

        const prompt =
            await prepareLessonPrompt(
                context
            );



        // ====================================================
        // SAVE PROMPT
        // ====================================================

        this.savePrompt({

            type:
                "lesson_generation",

            lesson:
                room.progress.lesson,

            part:
                room.progress.part,

            prompt

        });



        // ====================================================
        // OPENAI GENERATES EVERYTHING
        // ====================================================

        const generatedLesson =
            await callGPT(prompt);



        // ====================================================
        // SAVE GPT RESULT
        // ====================================================

        this.saveGeneratedLesson(

            partId,

            generatedLesson

        );



        // ====================================================
        // SAVE KNOWLEDGE GPT SAYS WAS INTRODUCED
        // ====================================================

        this.applyGPTKnowledgeUpdate(
            generatedLesson
        );



        // ====================================================
        // SAVE GPT SUMMARY
        // ====================================================

        this.applyGPTLessonSummary(

            generatedLesson,

            partId

        );



        // ====================================================
        // SAVE GPT PROGRESSION RECOMMENDATION
        // ====================================================

        this.applyGPTProgressRecommendation(
            generatedLesson
        );



        this.touchRoom();

        this.saveRoomsToStorage();



        return {

            fromCache: false,

            partId,

            lesson:
                generatedLesson

        };

    }



    // ========================================================
    // ASK TEACHER
    // ========================================================
    //
    // Example:
    //
    // User asks:
    //
    // لماذا نستخدم are هنا؟
    //
    // This DOES NOT move the course forward.
    // ========================================================

    async askTeacher(
        learnerMessage
    ) {

        this.requireCurrentRoom();


        if (!learnerMessage) {

            throw new Error(
                "Teacher message is required."
            );

        }


        // ----------------------------------------------------
        // Save learner message
        // ----------------------------------------------------

        this.saveChatMessage({

            role: "user",

            content:
                learnerMessage

        });



        // ----------------------------------------------------
        // Build latest context
        // ----------------------------------------------------

        const context =
            await this.buildGPTContext();



        // ----------------------------------------------------
        // Prepare teacher-chat prompt
        // ----------------------------------------------------

        const prompt =
            await prepareTeacherChatPrompt(

                context,

                learnerMessage

            );



        // ----------------------------------------------------
        // Save prompt
        // ----------------------------------------------------

        this.savePrompt({

            type:
                "teacher_chat",

            lesson:
                this.currentRoom
                    .progress
                    .lesson,

            part:
                this.currentRoom
                    .progress
                    .part,

            prompt

        });



        // ----------------------------------------------------
        // OpenAI answers
        // ----------------------------------------------------

        const response =
            await callGPT(prompt);



        // ----------------------------------------------------
        // Save teacher answer
        // ----------------------------------------------------

        this.saveChatMessage({

            role: "assistant",

            content:
                response

        });



        // ----------------------------------------------------
        // If GPT taught something useful during the answer,
        // simply save what GPT reports.
        // ----------------------------------------------------

        this.applyGPTKnowledgeUpdate(
            response
        );



        this.touchRoom();

        this.saveRoomsToStorage();



        return response;

    }



    // ========================================================
    // GENERATE PRACTICE
    // ========================================================
    //
    // Practice does NOT change:
    //
    // Standard
    // Lesson
    // Part
    //
    // ========================================================

    async generatePractice({

        amount = 5,

        difficulty =
            "appropriate",

        practiceType =
            "mixed"

    } = {}) {

        this.requireCurrentRoom();



        // ----------------------------------------------------
        // Build context
        // ----------------------------------------------------

        const context =
            await this.buildGPTContext();



        // ----------------------------------------------------
        // Prepare practice prompt
        // ----------------------------------------------------

        const prompt =
            await preparePracticePrompt(

                context,

                {

                    amount,

                    difficulty,

                    practiceType

                }

            );



        // ----------------------------------------------------
        // Save prompt
        // ----------------------------------------------------

        this.savePrompt({

            type:
                "practice",

            lesson:
                this.currentRoom
                    .progress
                    .lesson,

            part:
                this.currentRoom
                    .progress
                    .part,

            prompt

        });



        // ----------------------------------------------------
        // OpenAI generates practice
        // ----------------------------------------------------

        const practice =
            await callGPT(prompt);



        // ----------------------------------------------------
        // Save practice history
        // ----------------------------------------------------

        const practiceRecord = {

            id:
                this.generateId(
                    "practice"
                ),

            standard:
                this.currentRoom
                    .progress
                    .standard,

            lesson:
                this.currentRoom
                    .progress
                    .lesson,

            part:
                this.currentRoom
                    .progress
                    .part,

            settings: {

                amount,

                difficulty,

                practiceType

            },

            data:
                practice,

            createdAt:
                new Date()
                    .toISOString()

        };


        this.currentRoom
            .practiceHistory
            .push(
                practiceRecord
            );



        this.touchRoom();

        this.saveRoomsToStorage();



        return practiceRecord;

    }



    // ========================================================
    // SAVE GENERATED LESSON
    // ========================================================

    saveGeneratedLesson(
        partId,
        lessonData
    ) {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        room.generatedLessons[
            partId
        ] = lessonData;



        if (
            !room.lessonHistory
                .includes(partId)
        ) {

            room.lessonHistory
                .push(partId);

        }


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // GET SAVED LESSON
    // ========================================================

    getSavedLesson(partId) {

        this.requireCurrentRoom();


        return (

            this.currentRoom
                .generatedLessons[
                    partId
                ]

            || null

        );

    }



    // ========================================================
    // GET CURRENT PART ID
    // ========================================================

    getCurrentPartId() {

        this.requireCurrentRoom();


        const lesson =
            this.currentRoom
                .progress
                .lesson;


        const part =
            this.currentRoom
                .progress
                .part;


        return `${lesson}.${part}`;

    }



    // ========================================================
    // GET CURRENT SAVED PART
    // ========================================================

    getCurrentSavedPart() {

        return this.getSavedLesson(

            this.getCurrentPartId()

        );

    }



    // ========================================================
    // COMPLETE CURRENT PART
    // ========================================================

    completeCurrentPart() {

        this.requireCurrentRoom();


        const partId =
            this.getCurrentPartId();


        if (
            !this.currentRoom
                .completedParts
                .includes(partId)
        ) {

            this.currentRoom
                .completedParts
                .push(partId);

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


        this.completeCurrentPart();


        this.currentRoom
            .progress
            .part += 1;


        this.touchRoom();

        this.saveRoomsToStorage();


        return await this
            .generateCurrentPart();

    }



    // ========================================================
    // PREVIOUS PART
    // ========================================================

    previousPart() {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        if (
            room.progress.part <= 1
        ) {

            return null;

        }


        room.progress.part -= 1;


        this.touchRoom();

        this.saveRoomsToStorage();


        const partId =
            this.getCurrentPartId();


        return {

            partId,

            lesson:
                room.generatedLessons[
                    partId
                ] || null

        };

    }



    // ========================================================
    // GO TO SPECIFIC PART
    // ========================================================

    goToPart(
        partNumber
    ) {

        this.requireCurrentRoom();


        if (
            !Number.isInteger(
                partNumber
            ) ||
            partNumber < 1
        ) {

            throw new Error(
                "Invalid part number."
            );

        }


        this.currentRoom
            .progress
            .part =
                partNumber;


        this.touchRoom();

        this.saveRoomsToStorage();


        return this
            .getCurrentSavedPart();

    }



    // ========================================================
    // NEXT MAIN LESSON
    // ========================================================
    //
    // GPT can recommend moving forward.
    //
    // But only THIS machine changes lesson numbers.
    // ========================================================

    async nextLesson() {

        this.requireCurrentRoom();


        const room =
            this.currentRoom;


        const currentLesson =
            room.progress.lesson;



        if (
            currentLesson >=
            MASTER_LANGUAGE_CONFIG
                .totalLessons
        ) {

            throw new Error(
                "The final lesson has already been reached."
            );

        }



        if (
            !room.completedLessons
                .includes(
                    currentLesson
                )
        ) {

            room.completedLessons
                .push(
                    currentLesson
                );

        }



        room.progress.lesson += 1;

        room.progress.part = 1;

        room.progress.partGroup = 1;


        room.progress.standard =
            this.calculateStandard(

                room.progress.lesson

            );


        this.currentBlueprint =
            null;


        this.touchRoom();

        this.saveRoomsToStorage();


        return await this
            .generateCurrentPart();

    }



    // ========================================================
    // GO TO SPECIFIC MAIN LESSON
    // ========================================================

    async goToLesson(
        lessonNumber
    ) {

        this.requireCurrentRoom();


        if (
            !Number.isInteger(
                lessonNumber
            ) ||
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
            this.calculateStandard(
                lessonNumber
            );


        this.currentBlueprint =
            null;


        this.touchRoom();

        this.saveRoomsToStorage();


        return await this
            .generateCurrentPart();

    }



    // ========================================================
    // SET PART GROUP
    // ========================================================
    //
    // This does not teach anything.
    //
    // It simply stores the current curriculum position.
    // ========================================================

    setPartGroup(
        partGroup
    ) {

        this.requireCurrentRoom();


        if (
            !Number.isInteger(
                partGroup
            ) ||
            partGroup < 1
        ) {

            throw new Error(
                "Invalid part group."
            );

        }


        this.currentRoom
            .progress
            .partGroup =
                partGroup;


        this.touchRoom();

        this.saveRoomsToStorage();


        return partGroup;

    }



    // ========================================================
    // USE GPT'S RECOMMENDED NEXT PART GROUP
    // ========================================================
    //
    // This is explicit.
    //
    // It does NOT happen automatically.
    // ========================================================

    useRecommendedPartGroup() {

        this.requireCurrentRoom();


        const recommendation =
            this.currentRoom
                .lastProgressRecommendation;


        if (
            !recommendation ||
            !recommendation
                .recommended_next_part_group
        ) {

            return null;

        }


        return this.setPartGroup(

            recommendation
                .recommended_next_part_group

        );

    }



    // ========================================================
    // APPLY GPT KNOWLEDGE UPDATE
    // ========================================================
    //
    // GPT decides what was taught.
    //
    // Machine only saves it.
    // ========================================================

    applyGPTKnowledgeUpdate(
        generatedData
    ) {

        if (!generatedData) {

            return;

        }


        const update =
            generatedData
                .knowledge_update;


        if (!update) {

            return;

        }


        const knowledge =
            this.currentRoom
                .knowledge;



        this.mergeUniqueValues(

            knowledge.vocabulary,

            update
                .vocabulary_introduced

        );


        this.mergeUniqueValues(

            knowledge.expressions,

            update
                .expressions_introduced

        );


        this.mergeUniqueValues(

            knowledge.grammar,

            update
                .grammar_introduced

        );


        this.mergeUniqueValues(

            knowledge.pronunciation,

            update
                .pronunciation_introduced

        );


        this.mergeUniqueValues(

            knowledge.concepts,

            update
                .concepts_reviewed

        );


        if (
            Array.isArray(
                update.common_mistakes
            )
        ) {

            this.mergeUniqueValues(

                knowledge.commonMistakes,

                update.common_mistakes

            );

        }


        this.touchRoom();

        this.saveRoomsToStorage();

    }



    // ========================================================
    // SAVE GPT LESSON SUMMARY
    // ========================================================

    applyGPTLessonSummary(
        generatedLesson,
        partId
    ) {

        if (
            !generatedLesson ||
            !generatedLesson.lesson_summary
        ) {

            return;

        }


        const summaries =
            this.currentRoom
                .lessonSummaries;


        const existingIndex =
            summaries.findIndex(

                item =>
                    item.partId ===
                    partId

            );


        const record = {

            partId,

            summary:
                generatedLesson
                    .lesson_summary,

            createdAt:
                new Date()
                    .toISOString()

        };


        if (
            existingIndex >= 0
        ) {

            summaries[
                existingIndex
            ] = record;

        } else {

            summaries.push(
                record
            );

        }


        this.saveRoomsToStorage();

    }



    // ========================================================
    // APPLY GPT PROGRESS RECOMMENDATION
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
    // GET GPT PROGRESS RECOMMENDATION
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
    // GET CURRENT POSITION
    // ========================================================

    getCurrentPosition() {

        this.requireCurrentRoom();


        return {

            standard:
                this.currentRoom
                    .progress
                    .standard,

            lesson:
                this.currentRoom
                    .progress
                    .lesson,

            part:
                this.currentRoom
                    .progress
                    .part,

            partGroup:
                this.currentRoom
                    .progress
                    .partGroup,

            partId:
                this.getCurrentPartId()

        };

    }



    // ========================================================
    // SAVE CHAT MESSAGE
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
                new Date()
                    .toISOString()

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
            .slice(
                -amount
            );

    }



    // ========================================================
    // GET ALL CHAT
    // ========================================================

    getChatHistory() {

        this.requireCurrentRoom();


        return this.currentRoom
            .chatHistory;

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
    // GET PRACTICE HISTORY
    // ========================================================

    getPracticeHistory() {

        this.requireCurrentRoom();


        return this.currentRoom
            .practiceHistory;

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
    // MERGE VALUES WITHOUT DUPLICATES
    // ========================================================
    //
    // There is no teaching intelligence here.
    //
    // This is only storage cleanup.
    // ========================================================

    mergeUniqueValues(
        destination,
        incoming
    ) {

        if (
            !Array.isArray(
                destination
            ) ||
            !Array.isArray(
                incoming
            )
        ) {

            return;

        }


        for (
            const item
            of incoming
        ) {

            if (
                item === null ||
                item === undefined ||
                item === ""
            ) {

                continue;

            }


            const serializedItem =
                JSON.stringify(
                    item
                );


            const exists =
                destination.some(

                    existing =>

                        JSON.stringify(
                            existing
                        ) ===
                        serializedItem

                );


            if (!exists) {

                destination.push(
                    item
                );

            }

        }

    }



    // ========================================================
    // UPDATE LANGUAGES
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


        return {

            sourceLanguage:
                this.currentRoom
                    .sourceLanguage,

            targetLanguage:
                this.currentRoom
                    .targetLanguage

        };

    }



    // ========================================================
    // EXPORT CURRENT ROOM
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
    // SAVE ROOMS TO LOCAL STORAGE
    // ========================================================

    saveRoomsToStorage() {

        localStorage.setItem(

            MASTER_LANGUAGE_CONFIG
                .storageKeys
                .rooms,

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
                    .storageKeys
                    .rooms

            );


        if (!saved) {

            this.rooms = {};

            return;

        }


        try {

            this.rooms =
                JSON.parse(
                    saved
                );

        }

        catch (error) {

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

        if (
            !this.currentRoomId
        ) {

            return;

        }


        localStorage.setItem(

            MASTER_LANGUAGE_CONFIG
                .storageKeys
                .currentRoom,

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
                    .storageKeys
                    .currentRoom

            );

    }



    // ========================================================
    // UPDATE ROOM MODIFIED TIME
    // ========================================================

    touchRoom() {

        if (!this.currentRoom) {

            return;

        }


        this.currentRoom
            .updatedAt =
                new Date()
                    .toISOString();

    }



    // ========================================================
    // REQUIRE CURRENT ROOM
    // ========================================================

    requireCurrentRoom() {

        if (!this.currentRoom) {

            throw new Error(

                "No Master Language room is currently open."

            );

        }

    }



    // ========================================================
    // GENERATE ID
    // ========================================================

    generateId(prefix) {

        return (

            prefix +

            "_" +

            Date.now() +

            "_" +

            Math.random()
                .toString(36)
                .substring(
                    2,
                    9
                )

        );

    }

}



// ============================================================
// CREATE ONE GLOBAL MASTER ENGINE
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