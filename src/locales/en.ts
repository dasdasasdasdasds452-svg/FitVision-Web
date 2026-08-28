export const en = {
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
            recentScans: "Recent Scans",
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
        title: "Analysis Complete!",
        subtitle: "Great job! Our AI has finished processing your movement patterns.",
        formAccuracy: "Form Accuracy",
        capturedMistakes: "Captured Mistakes",
        overallRisk: "Overall Risk",
        workoutProgress: "Workout Progress",
        goalReached: "GOAL REACHED!",
        frequentMistakes: "Frequent Mistakes Breakdown",
        deepAnalysis: "Deep Analysis",
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
            countdown: {
                title: "3-Second Countdown",
                desc: "Delay recording to allow you to get into proper position."
            }
        },
        actions: {
            saveChanges: "Save Changes",
            saved: "SAVED",
            cancel: "Cancel"
        }
    },
    tutorial: {
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
            privacy: "Your video stream is processed locally and never stored."
        }
    },
    camera: {
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
        heroTitle1: "EVOLVE YOUR",
        heroTitle2: "PERFORMANCE.",
        heroSubtitle: "Access elite biometric tracking and AI-driven workout optimization. Your journey to peak physical condition starts here.",
        feature1: "Real-time Form Correction",
        feature2: "Predictive Analytics",
        welcomeBack: "Welcome Back",
        signInSubtitle: "Please enter your details to sign in.",
        orContinueWith: "Or continue with",
        emailLabel: "Email Address",
        emailPlaceholder: "name@vision.ai",
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
        processing: "PROCESSING...",
        signUp: "SIGN UP",
        signUpSuccess: "Sign up successful! You can now log in."
    },
    notifications: {
        title: "Notifications",
        newCount: "1 New",
        personalRecord: "New personal record on Squat!",
        hoursAgo: "2 hours ago",
        systemUpdate: "System update v2.1 is available.",
        yesterday: "Yesterday"
    }
};
