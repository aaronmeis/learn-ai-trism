# Agent handoff: learn-ai-trism

**Site:** `C:\projects\claude\learn-ai-trism`
**Live:** https://aaronmeis.github.io/learn-ai-trism/
**Prefix:** `lat:` · **SW cache:** `learn-ai-trism-v9`
**Packs (source of truth):**
- `Learning/one-day-mastery/ai-trism/` (odm-ai-trism)
- `Learning/tech-deep-dive/ai-trism/` (tdd-ai-trism)

Vault wins over NotebookLM. Gartner layer and pillar names stay secondary unless a Gartner-owned page is cited. Not Gartner or NIST official guidance, and not legal advice.

## State as of 2026-11-10

| Piece | Status |
|---|---|
| Curriculum, glossary (45), views, debates, EA crosswalk, source ledger | In `js/data.js` from the packs |
| Quiz | 55 items, every one with `id`, `explanation` and `trap`. 14 are multiple choice with per-option feedback. TDD and ODM packs behind a toggle |
| Daily challenge | Works. `DATA.drills` has four pools of 12: `where`, `auth`, `altitude`, `claim` |
| Quiz interaction | `js/quiz.js`: confidence, typed attempt, self-grade, spacing (2, 7, 18, 45 days), Due and Missed filters, mixed check, sitting record, grading-prompt copy |
| Practice | `#/practice`: teach-back timer, reviewer questions, P1 to P8 preset, claim sort, Handbook Assistant placement |
| Library | 81 pages. The two quiz-bank pages show the why and trap lines |
| Shorts and deep-dive | Unlisted YouTube IDs wired. Six MP4 shorts in `media/shorts/` |

## Where the quiz content comes from

The vault quiz banks hold the same ids as `DATA.quiz`:
`Learning/tech-deep-dive/ai-trism/reference/quiz-bank.md` and `Learning/one-day-mastery/ai-trism/reference/quiz-bank.md`.
Every why and trap cites a ledger row or a pack note. Change the vault first, then mirror to `js/data.js`.

## Open work

1. **`lookLike` for the 22 curriculum modules** that have no "What does this look like in practice" text (`DATA.looks` covers 8 of 30). Write it in the block notes first.
2. **Practice mode "miss to lesson"** is partly done: a card links to its best-matching Short. Linking to the matching flashcard and curriculum module is not.
3. **Glossary** is 45 terms but thin in Integration (1) and Threats (2). Add `see_also` links.
4. **Other learn sites** share this shell and have no `DATA.drills` (daily challenge is empty there). Each needs its own drill items from its own pack.
5. **Market Guide PDF** stays paywalled. Keep layer names secondary.
6. **Stale pack notes.** ODM block 3 still says only LLM01 was read in full and ODM block 4 says Ray 2026 is unread. The source ledger marks both as read. Reconcile in the vault, then rebuild the library.

## Publish hygiene

- No Python, operator pages, `.env`, or keys in the public tree.
- Bump `sw.js` `CACHE` (`learn-ai-trism-vN`) on every shell or data change.
- Hash routes only (`#/glossary`).
- Before a push, run `node --check` on `js/data.js`, `js/quiz.js`, `js/app.js`, `js/enhance.js`.
- Validation: every `DATA.quiz` item needs `id`, `explanation`, `trap`. Each multiple-choice `answer` must equal one of its `options`, and `optionWhy` must have one entry per option.
- Rebuild library pages with the private generator `C:\projects\grok\one_day_mastery\learn_console\build_library.py --slug ai-trism`. Do not copy it into this repo. Do not publish pages that link the vault's job tickets.
