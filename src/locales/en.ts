export const en = {
    body: {
        sides: { left: "left", right: "right", none: "" },
        issues: {
            shoulder_hike: { title: "Your {side} shoulder is higher", cue: "Drop your {side} shoulder so both are level" },
            hip_drop: { title: "Your {side} hip is dropping", cue: "Brace your core and keep your hips level" },
            knee_valgus: { title: "Your {side} knee caves in", cue: "Push your {side} knee out over your toes" },
            leg_uneven: { title: "Your {side} leg bends less", cue: "Share the load evenly between both legs" },
            arm_uneven: { title: "Your {side} arm lags behind", cue: "Press so both arms move together" },
            heel_lift: { title: "Your {side} heel lifts", cue: "Keep your {side} heel down the whole rep" },
            torso_lean: { title: "Leaning too far forward", cue: "Chest up, eyes forward" }
        },
        whereTitle: "Where it went wrong",
        whereNote: "Measured from joint positions. Left/right means your body's side.",
        timesInSet: "{n}×"
    },
    missions: {
        title: "Fix-it mission",
        goal: "{n} sets of {exercise} without “{issue}”",
        progress: "{done}/{n} clean sets",
        start: "Train this mission",
        focus: "Focus: {cue}",
        done: "Mission complete! You fixed “{issue}”",
        badges: "Badges",
        empty: "Do a set or two and a mission will be set from what you need to fix",
        skip: "Skip this mission",
        summaryPass: "Mission: this set was clean ({done}/{n})",
        summaryFail: "Mission: “{issue}” showed up again. Try another set ({done}/{n})"
    },
    sets: {
        setsLabel: "Sets",
        restLabel: "Rest between sets",
        restSeconds: "{s}s",
        weightLabel: "Weight (kg)",
        weightHint: "Optional. Add it to see the weight where your form starts to break",
        setOf: "Set {n}/{total}",
        resting: "Rest",
        nextIn: "Set {n} starts in",
        skipRest: "I'm ready, start now",
        spokenRest: "Nice. Rest {s} seconds",
        spokenNext: "Set {n}, go",
        table: "Set by set",
        set: "Set",
        reps: "Reps",
        score: "Form",
        mistakes: "Mistakes",
        kg: "kg",
        weightTitle: "Weight vs form",
        weightBreak: "Form holds up to {ok} kg and breaks at {bad} kg",
        weightAllGood: "Form is good at every weight so far (up to {max} kg). Add weight gradually",
        weightAllBad: "Form isn't stable even at {min} kg. Go lighter and nail the technique first",
        weightNeedData: "Log the weight for at least 2 different loads to see where form breaks"
    },
    recap: {
        title: "Last week",
        body: "{days} days · {sessions} sets · avg form {score}",
        better: "Up {n}% from the week before",
        worse: "Down {n}% from the week before",
        focus: "Focus this week: {issue}"
    },
    ghost: {
        label: "Ghost rep",
        on: "On",
        off: "Off",
        toggle: "Show or hide your best rep",
        legend: "Dashed blue = your cleanest rep, matched to your depth",
        none: "No ghost yet. Do a clean rep and it'll be saved as your ghost",
        saved: "New ghost saved: this is now your best rep"
    },
    friends: {
        title: "Friends",
        subtitle: "Train together. Friends only see your name and weekly totals, never your videos or mistakes.",
        myCode: "Your friend code",
        copy: "Copy code",
        copied: "Copied",
        share: "Share",
        shareText: "Train with me on FitVision. Add my friend code: {code}",
        addTitle: "Add a friend",
        addLabel: "Friend code",
        addPlaceholder: "e.g. K7Q2MD",
        add: "Add",
        added: "{name} is now your friend",
        notFound: "No one has that code. Check it and try again",
        self: "That's your own code",
        already: "You're already friends with {name}",
        failed: "Couldn't connect. Try again in a moment",
        invalid: "Codes are 6 letters or numbers",
        boardTitle: "This week",
        boardNote: "Ranked by days trained, then sets",
        days: "days",
        sets: "sets",
        form: "form",
        streak: "{n}-day streak",
        you: "You",
        empty: "No friends yet. Share your code to start a weekly challenge",
        remove: "Remove",
        removeConfirm: "Tap again to remove",
        needAccount: "Friends need a cloud account",
        needAccountDesc: "Sign in with an email and password (not demo) so friends can find you. Your workout history stays private.",
        notConfigured: "Friends aren't switched on yet",
        notConfiguredDesc: "This app isn't connected to its cloud database yet. Your workouts still work and stay on this device.",
        loading: "Loading friends…",
        homeLink: "Friends this week",
        homeLinkDesc: "See who trained most and keep each other going"
    },
    motivation: {
        greet: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Up late" },
        headlineFresh: "What are we training today?",
        headlineDone: "You trained today. One more set?",
        headlineStreak: "Train today to keep your {n}-day streak",
        streakDays: "{n}-day streak",
        streakStart: "Start a streak today",
        streakHint: "One set a day keeps it going",
        weekTitle: "This week's goal",
        weekCount: "{done}/{goal} days",
        weekReached: "Goal reached. Great work!",
        weekLeft: "{n} more to go",
        goalLabel: "Goal (days per week)",
        lessGoal: "Lower goal",
        moreGoal: "Raise goal",
        days: ["M", "T", "W", "T", "F", "S", "S"],
        bestTitle: "Personal bests",
        noBest: "None yet",
        ach: {
            first_session: "Your first set! Great start",
            personal_best: "New best! {score}% (was {previous}%)",
            perfect_set: "Perfect set: no mistakes",
            goal_reached: "Weekly goal of {goal} days reached",
            streak: "{n} days in a row"
        },
        verdictGreat: "Beautiful form!",
        verdictGood: "Getting better",
        verdictWork: "You found what to fix. That's progress",
        share: "Share",
        copied: "Copied",
        shareText: "Just did {reps} reps of {exercise} with {score}% form on FitVision",
        onboardTitle: "Get started in 3 steps",
        onboard1: "Pick an exercise and reps below",
        onboard2: "Put your phone at your side, 2–3 m away, whole body in view",
        onboard2Link: "How",
        onboard3: "Open the camera and lift. The AI counts reps and warns you",
        onboardDismiss: "Got it",
        goalHit: "{n} reps done!",
        spokenGoal: "Done. Nice work"
    },
    system: {
        errorTitle: "Something went wrong",
        errorDesc: "This page hit an error. Your saved workouts are not affected.",
        tryAgain: "Try again",
        goHome: "Go to Home",
        notFoundTitle: "Page not found",
        notFoundDesc: "The link may be old or mistyped.",
        loading: "Loading…"
    },
    home: {
        question: "What are we training today?",
        startTitle: "Start a set",
        step1: "Choose exercise",
        step2: "Reps per set",
        step3: "Before you start",
        check1: "Camera at your side, 2–3 m away",
        check2: "Whole body in frame, head to feet",
        check3: "Good light, not backlit",
        openCamera: "Open camera",
        repsUnit: "reps",
        decreaseReps: "Fewer reps",
        increaseReps: "More reps",
        howToSetup: "How to set up the camera",
        fixFirst: "Fix this first",
        fixFoundIn: "Found in {n} of your last {total} sessions",
        askCoach: "Ask the AI coach about this",
        noFixYet: "Do one set and the AI will tell you what to fix first.",
        allGood: "No repeated mistakes in your recent sessions. Nice work!",
        last7Days: "Last 7 days",
        avgForm: "Avg form score",
        sessions: "Sessions",
        totalReps: "Total reps",
        recent: "Recent sessions",
        viewHistory: "View all history",
        noScore: "No score",
        coachPrompt: "My {exercise} keeps showing \"{error}\". How do I fix it?"
    },
    dashboard: {
        greeting: "Hello,",
        athlete: "Athlete",
        subtitle: "Ready to perfect your form today?",
        exerciseSelection: {
            benchPress: "Bench Press",
            squat: "Back Squat",
            deadlift: "Deadlift"
        },
        actionCard: {
            badge: "AI Powered",
            selected: "selected",
            title: "Start AI Form Analysis",
            description: "Analyze your workout form in real-time with our advanced computer vision technology. Get instant feedback on your posture.",
            launchCamera: "Launch Camera",
            viewTutorial: "View Tutorial",
            repGoalLabel: "Repetitions Goal:"
        },
        stats: {
            formAccuracy: "Form Accuracy",
            avgScore: "avg. score",
            basedOn: "Based on last {count} sessions",
            aiTip: "AI Tip",
            aiTipDesc: "Your squat depth has improved, but watch your knee alignment on the ascent.",
            seeDetails: "See details",
            recentScans: "Recent Sessions",
            viewAll: "View all",
            noSessions: "No sessions yet. Click 'Launch Camera' to start.",
            flawlessSet: "Flawless Set",
            mistakesDetected: "Mistakes Detected",
            accuracy: "accuracy"
        }
    },
    nav: {
        home: "Home",
        history: "History",
        camera: "AI Camera",
        stats: "Stats",
        settings: "Settings",
        aiCoach: "AI Coach",
        friends: "Friends",
        logout: "Logout"
    },
    history: {
        title: "Workout History",
        subtitle: "Track your form accuracy and consistency over time.",
        filters: {
            all: "All Exercises"
        },
        chart: {
            title: "Form Accuracy Trend",
            subtitle: "Last 30 Days",
            progress: "Excellent Progress",
            sessionsShown: "sessions · Last 10 shown"
        },
        heatmap: {
            title: "Activity Heatmap",
            viewYear: "View 2025",
            exportData: "Export Data",
            streak: "Current Streak",
            totalWorkouts: "Total Workouts",
            days: "Days"
        },
        pastSessions: {
            title: "Past Sessions",
            empty: "No recent sessions found. Go do some lifts!",
            perfectForm: "Perfect Form",
            mistakes: "Mistakes Detected",
            accuracy: "Accuracy"
        },
        statsCards: {
            avgScore: "Avg. Score",
            bestScore: "Best Score",
            totalReps: "Total Reps",
            sessions: "Sessions"
        },
        startWorkout: "Start Workout",
        perfect: "PERFECT",
        reps: "reps",
        avg: "avg"
    },
    summary: {
        noSessionTitle: "No workout yet",
        noSessionDesc: "Finish a set and your results will show up here.",
        startWorkout: "Start a set",
        clipUnavailable: "Clips are only kept in the tab you trained in.",
        scoreUnavailable: "No score — the AI server didn't respond",
        topFix: "Fix #1",
        foundTimes: "found {n} times",
        title: "Analysis Complete!",
        subtitle: "Great job! Our AI has finished processing your movement patterns.",
        formAccuracy: "Form Accuracy",
        capturedMistakes: "Captured Mistakes",
        overallRisk: "Overall Risk",
        workoutProgress: "Workout Progress",
        goalReached: "GOAL REACHED!",
        frequentMistakes: "Frequent Mistakes Breakdown",
        deepAnalysis: "Deep Analysis",
        errorTimeline: "Error Timeline",
        aiAnalysisTitle: "AI Analysis & Correction Advice",
        aiAnalyzing: "AI is analyzing your form...",
        getAiAdvice: "Get AI Advice",
        repPrefix: "Rep #",
        riskLevels: {
            high: "High",
            moderate: "Moderate",
            safe: "Safe"
        },
        errorReplays: {
            title: "Error Replays (Auto-Captured)",
            reviewRecommended: "REVIEW RECOMMENDED",
            perfectSet: "PERFECT SET",
            flawlessTitle: "Flawless Technique!",
            flawlessDesc: "The AI did not detect any form breaks during your session. Keep up the great work.",
            mistakeClip: "MISTAKE CLIP",
            clipDesc: "This 3-second clip shows the exact moment your form deteriorated."
        },
        actions: {
            tryAgain: "Try Again",
            backToDashboard: "Back to Dashboard"
        }
    },
    settings: {
        account: {
            title: "Account",
            signedInAs: "Signed in as",
            guest: "Guest (demo mode)"
        },
        imageTooLarge: "Couldn't save that image. Try a smaller photo.",
        title: "Settings",
        subtitle: "Synchronize your biometric data and calibrate the",
        subtitleHighlight: "FitVision AI",
        subtitleEnd: "neural core for maximum performance.",
        biometric: {
            title: "Biometric Identity",
            uploadPhoto: "Upload Photo",
            displayName: "Display Name",
            height: "Height (cm)",
            weight: "Weight (kg)"
        },
        aiPreferences: {
            title: "AI Preferences",
            voice: {
                title: "Enable Voice Feedback (Coach Mode)",
                desc: "AI will provide real-time vocal corrections during sets."
            },
            autoSave: {
                title: "Auto-save Error Replays",
                desc: "Automatically clip and save footage where form breakdown is detected."
            },
            ghost: {
                title: "Ghost Rep",
                desc: "Show your cleanest rep as a dashed skeleton to follow during the set."
            },
            countdown: {
                title: "3-Second Countdown",
                desc: "Delay recording to allow you to get into proper position."
            }
        },
        actions: {
            saveChanges: "Save Changes",
            saved: "Saved!",
            cancel: "Cancel"
        }
    },
    tutorial: {
        page: {
            title: "Set up your camera",
            subtitle: "Three things decide how accurate the AI is. It takes about a minute.",
            step: "Step",
            topView: "Seen from above",
            doTitle: "Do: side view, whole body",
            dontTitle: "Avoid: front view, too close",
            exercisesTitle: "What the AI checks",
            methodNote: "Models: XGBoost + Random Forest, tested on videos they were not trained on.",
            accuracy: "Accuracy on unseen data",
            start: "Open camera",
            back: "Back"
        },
        hero: {
            tag: "System Calibration Required",
            title: "How to set up your camera for",
            titleHighlight: "AI Analysis",
            subtitle: "Proper placement ensures",
            subtitleHighlight: "high accuracy",
            subtitleEnd: "in joint tracking and real-time form correction. Follow these steps for peak performance."
        },
        steps: {
            distance: {
                title: "01. Distance",
                desc: "Place your device",
                descHighlight: "2-3 meters",
                descEnd: "away. Your entire body must be visible from head to toe in the frame."
            },
            angle: {
                title: "02. Angle",
                desc: "Position at a",
                descHighlight: "45° or 90° angle",
                descEnd: ". Avoid straight-on views to allow the AI to perceive depth and limb extension."
            },
            lighting: {
                title: "03. Lighting",
                desc: "Ensure the area is",
                descHighlight: "well-lit",
                descEnd: ". High contrast between your body and the background helps joint marker detection."
            }
        },
        capabilities: {
            title: "Supported Exercises & Capabilities",
            squat: {
                title: "Back Squat",
                desc: "Deep Multi-Layer Perceptron model with",
                descHighlight: "detailed mistake detection",
                points: [
                    "Shallow depth",
                    "Forward lean",
                    "Knees caving in",
                    "Heels off ground",
                    "Asymmetric movement"
                ]
            },
            deadlift: {
                title: "Deadlift",
                desc: "Deep Multi-Layer Perceptron model for",
                descHighlight: "overall form validation",
                points: [
                    "Checks overall biomechanics",
                    "Verifies back alignment",
                    "Validates hip hinge"
                ],
                note: "Binary Correct/Incorrect feedback"
            },
            benchpress: {
                title: "Bench Press",
                desc: "Decision Tree ensemble for",
                descHighlight: "upper body validation",
                points: [
                    "Checks elbow tuck",
                    "Back arch validation",
                    "Wrist straightness"
                ],
                note: "Binary Correct/Incorrect feedback"
            }
        },
        visualGuide: {
            title: "Visual Setup Guide",
            correct: {
                tag: "RECOMMENDED",
                title: "CORRECT: Side Profile",
                desc: "Side-angle setup allows our AI to track spine alignment and knee flexion with maximum precision.",
                point1: "Full body visible in frame",
                point2: "90 degree clearance from camera"
            },
            incorrect: {
                tag: "AVOID",
                title: "INCORRECT: Front Facing / Close",
                desc: "Front-on views obscure limb depth. Being too close cuts off crucial tracking points for movement analysis.",
                point1: "Joints obscured by perspective",
                point2: "Legs or head cut off from frame"
            }
        },
        cta: {
            button: "I UNDERSTAND, LAUNCH CAMERA",
            privacy: "Video never leaves your device — only joint angles are sent for analysis."
        }
    },
    camera: {
        confirmEnd: "Tap again to end",
        serverBusy: "AI server is busy — retrying…",
        repSpoken: "{n}",
        back: "Back",
        aiActive: "AI ACTIVE",
        live: "LIVE",
        loading: "LOADING",
        form: "Form",
        reps: "Reps",
        endWorkout: "END WORKOUT",
        exerciseName: {
            benchpress: "Bench Press",
            squat: "Back Squat",
            deadlift: "Deadlift"
        },
        aiPowered: "AI-Powered Form Analysis",
        formScore: "Form Score",
        injuryRisk: "Injury Risk",
        lowRisk: "Low Risk",
        highRisk: "High Risk",
        repetitions: "Repetitions",
        normalSpeed: "Normal Speed",
        repTempo: "Rep Tempo",
        repCount: "Repetitions",
        warmup: {
            cameraReady: "Camera ✓",
            cameraLoading: "Camera...",
            poseReady: "Pose AI ✓",
            poseLoading: "Pose AI...",
            serverReady: "Server ✓",
            serverLoading: "Server...",
            serverWaking: "Waking...",
            serverMessage: "The AI server is waking up from power-saving mode. This takes about",
            serverTime: "30-60 seconds",
            serverHint: "— feel free to select your exercise while waiting.",
            exerciseLabel: "Exercise",
            goalLabel: "Goal",
            startAnalysis: "START FORM ANALYSIS",
            loadingPose: "Loading Pose AI...",
            waitingServer: "Waiting for server...",
            uploadVideo: "or upload a video instead"
        },
        exerciseOptions: {
            benchpress: "🏋️ Bench Press",
            squat: "🦵 Back Squat",
            deadlift: "💪 Deadlift"
        },
        feedback: {
            aiReady: "AI Ready",
            startExercising: "Start exercising to get feedback.",
            waitForAI: "Wait for AI to process form...",
            goodForm: "Good Form! 💪",
            correctionNeeded: "Correction Needed",
            processingSim: "Processing Simulation..."
        },
        loadingCamera: "Loading Camera...",
        workoutComplete: {
            title: "Workout Complete!",
            subtitle1: "You have successfully completed",
            subtitle2: "of",
            viewSummary: "View Summary",
            continue: "Continue (+5 Reps)"
        }
    },
    chat: {
        title: "AI Coach",
        subtitle: "Ask anything about exercise form, technique, or injury prevention.",
        messagesCount: "messages",
        clearHistory: "Clear history",
        confirmClear: "Confirm clear history?",
        clearNow: "Clear now",
        cancelClear: "Cancel",
        aiThinking: "AI is thinking...",
        inputPlaceholder: "Ask anything about exercise...",
        poweredBy: "Powered by Gemini AI via KKU Gateway",
        today: "Today",
        yesterday: "Yesterday",
        errorMessage: "Sorry, an error occurred: ",
        errorFallback: "Could not connect to AI",
        tryAgain: "Please try again.",
        features: {
            biomechanics: "Biomechanics Expert",
            formAnalysis: "Form Analysis",
            injuryPrevention: "Injury Prevention",
            bilingualSupport: "Thai & English"
        },
        suggestions: [
            { icon: "fitness_center", text: "What is the correct Squat form?", tag: "Form" },
            { icon: "healing", text: "How to fix knee caving during Squat?", tag: "Fix" },
            { icon: "exercise", text: "What warm-up should I do before Bench Press?", tag: "Prep" },
            { icon: "trending_up", text: "Tips for safely increasing Deadlift weight", tag: "Advance" },
            { icon: "self_improvement", text: "Beginner muscle building program", tag: "Program" },
            { icon: "monitor_heart", text: "Correct breathing technique while lifting weights", tag: "Technique" }
        ]
    },
    login: {
        heroTitle: "Lift with better form.",
        heroPoints: ["Counts your reps automatically", "Warns you the moment your form slips", "Tells you the one thing to fix after each set"],
        privacyNote: "Video never leaves your device — only joint angles are sent for analysis.",
        createTitle: "Create an account",
        createSubtitle: "Your workouts are saved to your account.",
        localModeNote: "Local mode: your profile and history are stored on this device only.",
        tryDemo: "Try without an account",
        demoHint: "Data stays in this browser.",
        showPassword: "Show password",
        hidePassword: "Hide password",
        heroTitle1: "EVOLVE YOUR",
        heroTitle2: "PERFORMANCE.",
        heroSubtitle: "Access elite biometric tracking and AI-driven workout optimization. Your journey to peak physical condition starts here.",
        feature1: "Real-time Form Correction",
        feature2: "Predictive Analytics",
        welcomeBack: "Welcome back",
        signInSubtitle: "Please enter your details to sign in.",
        orContinueWith: "Or continue with",
        emailLabel: "Email Address",
        emailPlaceholder: "you@example.com",
        passwordLabel: "Password",
        forgotPassword: "Forgot?",
        signIn: "Sign In",
        noAccount: "Don't have an account?",
        createAccount: "Create Account",
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
        support: "Support",
        alreadyHaveAccount: "Already have an account?",
        signInToggle: "Sign In",
        processing: "Signing in…",
        signUp: "Create account",
        signUpSuccess: "Sign up successful! You can now log in.",
        oauthComingSoon: "Coming soon!",
        demoMode: "Enter Immediately (Demo / Guest Mode)"
    },
    notifications: {
        title: "Notifications",
        newCount: "1 New",
        personalRecord: "New personal record on Squat!",
        hoursAgo: "2 hours ago",
        systemUpdate: "System update v2.1 is available.",
        yesterday: "Yesterday"
    },
    detail: {
        loadingAnalysis: "Loading Analysis...",
        noDataTitle: "No Analysis Data Found",
        noDataDesc: "Select a specific error clip from the Summary or History page to view its detailed analysis.",
        goToHistory: "Go to History",
        back: "Back",
        autoCaptured: "Auto-captured error snapshot",
        export: "Export",
        aiAnalysis: "Gemini AI Analysis",
        severity: "Severity",
        timestamp: "Timestamp",
        analyzingForm: "Gemini AI is analyzing your form...",
        aiFailed: "AI Analysis failed",
        retry: "Retry",
        generatingCorrections: "Generating Corrections...",
        aiCorrections: "AI-Generated Corrections",
        warmupRecommendation: "Warm-up Recommendation",
        loadingSuggestion: "Loading suggestion...",
        warmupFallback: "Always warm up before heavy lifts. Dynamic stretching and activation exercises can help prevent form breakdown.",
        aiCoachNote: "AI Coach Note",
        generatingInsights: "Generating insights...",
        rerunAnalysis: "Re-run Analysis",
        analyzing: "Analyzing..."
    }
};
