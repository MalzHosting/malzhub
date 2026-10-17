# MalzHub Cyber Labs

Cybersecurity learning website for legal, defensive education.

## Contents
- `index.html`: responsive single-page application with 20 lessons, a randomized quiz, 15 local CTF challenges, 30 browser-based utilities, glossary, local progress/XP, and printable certificates.
- `vercel.json`: static deployment configuration.
- `.gitignore`: ignores local development artifacts.

## Run locally
Open `index.html` in a modern browser. SHA-256 and random utilities require a browser with Web Crypto support; use HTTPS or localhost if needed.

## Deploy to Vercel
Import the repository into Vercel. No build command or framework is required; the site is static.

## Notes
Progress is stored in the current browser's localStorage. It does not sync between devices. Certificates are generated locally and are not externally verified. There is no backend or account system in this version.

Only test systems you own or have explicit permission to assess.
