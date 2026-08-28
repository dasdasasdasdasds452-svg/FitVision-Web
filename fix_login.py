import os
import re

file_path = r"C:\fit\fitvision-next\src\app\login\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports and router
content = content.replace(
    'import anime from "animejs";',
    'import { useRouter } from "next/navigation";'
)
content = content.replace(
    "const router = require('next/navigation').useRouter();",
    "const router = useRouter();"
)
content = content.replace(
    'import React, { useEffect } from "react";',
    'import React from "react";'
)

# 2. Remove useEffect for anime
anime_effect = """    useEffect(() => {
        // Entrance animation
        anime({
            targets: '.animate-fade-in-up',
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 800,
            easing: 'easeOutExpo',
            delay: anime.stagger(150, { start: 100 })
        });
    }, []);"""
content = content.replace(anime_effect + "\n", "")

# 3. i18n
content = content.replace(
    'alert("Sign up successful! You can now log in.");',
    'alert(t.login.signUpSuccess);'
)
content = content.replace(
    '{loading ? "PROCESSING..." : (isSignUp ? "SIGN UP" : t.login.signIn)}',
    '{loading ? t.login.processing : (isSignUp ? t.login.signUp : t.login.signIn)}'
)
content = content.replace(
    '{isSignUp ? "Already have an account?" : t.login.noAccount}',
    '{isSignUp ? t.login.alreadyHaveAccount : t.login.noAccount}'
)
content = content.replace(
    '{isSignUp ? "Sign In" : t.login.createAccount}',
    '{isSignUp ? t.login.signInToggle : t.login.createAccount}'
)

# 4. Remove opacity-0
content = content.replace("animate-fade-in-up opacity-0", "animate-fade-in-up")

# 5. Accessibility and Focus styles
focus_ring = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0a]"

# Google button
content = content.replace(
    '<button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200">',
    f'<button aria-label="Sign in with Google" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200 {focus_ring}">'
)

# Apple button
content = content.replace(
    '<button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200">',
    f'<button aria-label="Sign in with Apple" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold text-slate-200 {focus_ring}">',
    1 # Only replace once, but wait, both buttons have same class initially. I replaced Google first, so the second one is Apple.
)

# Email input label
content = content.replace(
    '<label className="text-sm font-semibold text-slate-300 ml-1">{t.login.emailLabel}</label>',
    '<label htmlFor="email" className="text-sm font-semibold text-slate-300 ml-1">{t.login.emailLabel}</label>'
)
# Email input
content = content.replace(
    'className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"',
    f'id="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder:text-slate-600 focus:border-primary transition-all {focus_ring}"'
)

# Password input label
content = content.replace(
    '<label className="text-sm font-semibold text-slate-300">{t.login.passwordLabel}</label>',
    '<label htmlFor="password" className="text-sm font-semibold text-slate-300">{t.login.passwordLabel}</label>'
)
# Password input
content = content.replace(
    'className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"',
    f'id="password" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-slate-100 placeholder:text-slate-600 focus:border-primary transition-all {focus_ring}"'
)

# Forgot password link
content = content.replace(
    '<a className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight" href="#">{t.login.forgotPassword}</a>',
    f'<a className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight {focus_ring}" href="#">{{t.login.forgotPassword}}</a>'
)

# Toggle password visibility button
content = content.replace(
    '<button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" type="button">',
    f'<button aria-label="Toggle password visibility" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors {focus_ring}" type="button">'
)

# Submit button
content = content.replace(
    'className="w-full bg-primary text-black font-black py-4 rounded-xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(60,249,26,0.6)] transform transition-all active:scale-95 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"',
    f'className="w-full bg-primary text-black font-black py-4 rounded-xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(60,249,26,0.6)] transform transition-all active:scale-95 mt-2 disabled:opacity-50 disabled:cursor-not-allowed {focus_ring}"'
)

# Toggle Sign In / Sign Up button
content = content.replace(
    'className="text-primary font-bold hover:underline transition-all ml-1 underline-offset-4"',
    f'className="text-primary font-bold hover:underline transition-all ml-1 underline-offset-4 {focus_ring}"'
)

# Footer links
content = content.replace(
    '<a className="hover:text-primary transition-colors" href="#">',
    f'<a className="hover:text-primary transition-colors {focus_ring}" href="#">'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("done login")
