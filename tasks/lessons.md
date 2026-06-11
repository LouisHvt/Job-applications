# Lessons Learned

(Updated after corrections — format: [date] | what went wrong | rule to avoid it)

[2026-06-11] | buildCVHtml crashed (500) because data/profile.json lacks languages/otherInfo/phone while templates accessed them unguarded — same root cause as the earlier keyStats crash | profile.json fields are optional in practice: every template/prompt reading profile fields must use null-safe defaults (?? [] / ?? ''), never trust the Profile type to guarantee presence
