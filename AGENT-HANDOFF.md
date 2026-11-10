# Claude finish handoff — learn-ai-trism

**Site:** `C:\projects\claude\learn-ai-trism`  
**Live (after Pages):** https://aaronmeis.github.io/learn-ai-trism/  
**Prefix:** `lat:` · **SW cache:** `learn-ai-trism-v1`  
**Packs (source of truth):**  
- `Learning/one-day-mastery/ai-trism/` (odm-ai-trism)  
- `Learning/tech-deep-dive/ai-trism/` (tdd-ai-trism)

Vault wins over NotebookLM. Gartner layer/pillar names stay secondary unless a Gartner-owned page is cited. Not Gartner or NIST official guidance, and not legal advice.

## What is already done (shell retitle)

| Piece | Status |
|---|---|
| Shell forked from learn-dcsa; titles / `lat:` / `learn-ai-trism-v1` | Done |
| Root disclaimer in `index.html` + `README.md` | Done |
| `enhance.js` shorts + sheet disclaimers for AI-TRISM | Done |
| DCSA media/library cleared for this site | Done |

## Remaining holes (do not invent as done)

### 1. `js/data.js` still DCSA content
Sibling owns curriculum/glossary/quiz rewrite from ai-trism packs. Shell titles and KEY are AI-TRISM; data payload may still say DCSA until that land.

### 2. Glossary thicken toward 40–50
Vault glossaries are thinner (~25 ODM / ~30 TDD). Thicken toward 40–50 terms before treating flash/quiz as complete.

### 3. Optional ODM shorts
TDD shorts exist under NotebookLM output; ODM shorts are optional and not required for first publish. Do not invent catalog entries without files.

### 4. Market Guide PDF
Primary Gartner Market Guide PDF remains paywalled / not in the vault. Keep layer names secondary; do not fake primary citations.

### 5. Library HTML + media wiring
`library/` and `media/` were cleared. Rebuild library via private `build_library.py` after data is ready; copy shorts/posters/slides when GO'd. No library HTML or MP4s invented here.

### 6. Publish hygiene
- No Python, operator pages, `.env`, or keys in the public tree.
- Bump `sw.js` `CACHE` (`learn-ai-trism-vN`) on every shell/data change.
- Hash routes only (`#/glossary`).
- `node --check js/data.js js/app.js js/enhance.js` before push.
