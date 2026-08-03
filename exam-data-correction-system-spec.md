# Exam Data Correction System — Technical Specification

**Purpose of this document:** This is the build spec for automating the manual "Data Correction Process" (currently done by hand via SSMS) into a system with a C# .NET 8 API and a React frontend. It is written to be handed to a coding agent and built **phase by phase**, in the order below. Each phase is independently shippable and testable before moving to the next.

---

## 1. Problem Summary

Exam data currently moves through four manual stages, run by someone in SSMS:

1. Pull THEORY-paper marks from the **Online DB** (`EXAM_MARKS`) into the **Offline DB** (`REGDATA`).
2. Sync copy-coding records from Online DB (`COPY_CODING`) into Offline DB, computing a derived `BCODE` field.
3. Parse OMR "flap" `.DAT` files (dropped manually on a shared drive) into the Offline `BARCODES` table.
4. Parse raw award data (also dropped on the shared drive) into a structured, usable format.

All four stages are manual, error-prone, and undocumented outside SQL scripts. The goal is a system where a human triggers each stage from a web UI, sees a preview/result, and the system does the extraction/transformation/load reliably and auditably.

---

## 2. Key Environment Constraint (important — drives the architecture)

- **Online DB** lives on a Windows Server on AWS. The only current access method is **UltraViewer (remote desktop)** — there is no direct SQL connection, VPN, or linked server from the offline/local network into it today.
- **Offline DB** is local (SQL Server / LocalDB) where the correction/reporting work actually happens.
- Because there's no direct DB link, data cannot be pulled Online → Offline with a simple cross-server query or ADO.NET connection from the offline side.

**Chosen approach:** Host a small **"Script Generator" API directly on the Online AWS server** (since UltraViewer access lets us deploy something there). This API:
- Runs a predefined query against the Online DB into a temp table,
- Generates a SQL script (as text — `INSERT` statements, or `BCP`-style output) representing that temp table's contents,
- Exposes that script over HTTP.

The **Offline "Main" API** then calls this Online Script Generator API over the network, retrieves the script, and executes it against the Offline DB.

> **Prerequisite to confirm before Phase 1 build:** the Offline machine must be able to reach the Online AWS server over HTTP(S) — i.e., the AWS server needs a public IP / opened port with a firewall rule, or a tunnel (SSH tunnel / Cloudflare Tunnel / VPN). UltraViewer alone does not provide this; something must open a network path for API calls. Recommend: a small ASP.NET Minimal API on the AWS box, behind HTTPS, with a static API key or IP allow-list — do **not** expose it unauthenticated to the public internet.

```
┌─────────────────────────────┐        HTTPS + API Key        ┌───────────────────────────────────┐
│   ONLINE (AWS Windows Srv)  │ ─────────────────────────────► │   OFFLINE (Local machine/network)  │
│                              │                                │                                     │
│  SQL Server: EXAM_MARKS,    │                                │  SQL Server: REGDATA, COPY_CODING, │
│              COPY_CODING     │                                │              BARCODES, AWARDS...   │
│                              │                                │                                     │
│  "Script Generator" API      │◄────────── calls ─────────────│  "Main" C#.NET8 API                │
│   - GET /script/regdata     │                                │   - orchestrates all 4 stages      │
│   - GET /script/copycoding  │                                │   - executes returned scripts      │
└─────────────────────────────┘                                │   - watches shared drive for       │
                                                                 │     .DAT / award files             │
                                                                 │                                     │
                                                                 │  React SPA (dashboard/UI)          │
                                                                 └───────────────────────────────────┘
                                                                              ▲
                                                                              │
                                                                 ┌───────────────────────────────────┐
                                                                 │  Shared network drive               │
                                                                 │  (someone manually drops .DAT files │
                                                                 │   and award raw files here)         │
                                                                 └───────────────────────────────────┘
```

---

## 3. Source & Target Schemas (as given — do not change without confirming with stakeholder)

### 3.1 EXAM_MARKS (Online DB) — source for Stage 1
Full column list:
```
ID, COLLEGE_ID, COLLEGE_NAME, CENTER_ID, CENTER_PR, CENTER_NAME, ADM_SESSION, YEAR, EXAM_MODE,
COURSE_ID, COURSE_NAME, SEMESTER, ENROLL_NO, HONSUB, HONOURS, ROLLNO, STUDENT_TYPE, NAME, FNAME,
MNAME, GENDER, DOB, CATEGORY, RELIGION, MINORITY, PWD, MOBILE, PHOTO, SIGN, SUB_CODE, SUB_NAME,
SUB_TYPE, STYPE, PAPER_CODE, CONF_CODE, PAPER_NAME, PAP_TYPE, MM, PM, VERIFY, MARK1, MRK1_BY,
MRK1_AT, MARK2, MRK2_BY, MRK2_AT, MRK_LOCK, MRK_LOCK_BY, MRK_LOCK_AT, BARCODE, OMR_NO, OMR_SR,
LOCK, EWS, MRK_DT, COURSE_SHRT, RSF, PAP_SR, CREDIT, COADING, REMARK, GRP, PRMRK_LAST_DT
```
Columns actually consumed (per business rule): `ID, COLLEGE_ID, CENTER_ID, CENTER_NAME, SEMESTER, ENROLL_NO, ROLLNO, NAME, SUB_CODE, SUB_NAME, SUB_TYPE, PAPER_CODE, PAPER_NAME, MM, PM` **where `PAP_TYPE = 'THEORY'`**.

### 3.2 REGDATA (Offline DB) — target for Stage 1
```
ID, COLLEGE_ID, SEMESTER, CENTER_ID, CENTER_NAME, COURSE_ID, ENROLL_NO, ROLLNO, NAME, SUB_TYPE,
SUB_CODE, SUB_NAME, PCODE, PAPER_CODE, MM, PM, BARCODE, OMR_NO, OMR_SR, MARKS, STATUS, TRANSFER,
CHECKED, MARKS2
```
Columns populated by the sync: `ID, COLLEGE_ID, SEMESTER, CENTER_ID, CENTER_NAME, COURSE_ID, ENROLL_NO, ROLLNO, NAME, SUB_TYPE, SUB_CODE, SUB_NAME, PCODE, PAPER_CODE, MM, PM`.

⚠️ **Open question (do not guess in code — confirm first):** `COURSE_ID` and `PCODE` are targets in REGDATA but are not in the "highlighted" EXAM_MARKS source list. Likely `COURSE_ID` comes from the (unhighlighted) `EXAM_MARKS.COURSE_ID` column directly. `PCODE` has no obvious source — flag this and get the exact mapping/derivation before writing the Stage 1 script generator.

### 3.3 COPY_CODING (Online DB) — source for Stage 2
```
ID, PAPER_CODE, BARCODE, ROLLNO, OMR_NO, OMR_SR, CRAT, CRBY, adm_session, CD_TYPE
```

### 3.4 COPY_CODING (Offline DB) — target for Stage 2
```
ID, PAPER_CODE, BARCODE, BCODE, ROLLNO, OMR_NO, OMR_SR, CRAT, CRBY, adm_session, CD_TYPE
```
`BCODE` is derived, not sourced:
```sql
BCODE = CAST(PAPER_CODE AS VARCHAR(20)) + RIGHT('00000' + CAST(BARCODE AS VARCHAR(5)), 5)
```
(11-char code: PAPER_CODE + 5-digit zero-padded BARCODE.) Reference queries already validated by stakeholder:
```sql
-- Preview
SELECT *,
       PAPER_CODE + RIGHT('00000' + CAST(BARCODE AS VARCHAR(5)), 5) AS BCODE
FROM BCA_MBA_CC;

-- Apply
UPDATE BCA_MBA_CC
SET BCODE = CAST(PAPER_CODE AS VARCHAR(20))
         + RIGHT('00000' + CAST(BARCODE AS VARCHAR(5)), 5);
```

### 3.5 BARCODES (Offline DB) — target for Stage 3
```
ID, COURSE, FOLDER, IMG, BARCODE, COPY_CODE, PAPER_CODE, ROLLNO, CRBY, CRAT, REG, ERR, CHK, EXAM, ER1, ER2
```
Populated columns: `COURSE, FOLDER, BARCODE, PAPER_CODE, ROLLNO`.

Reference parsing query (fixed-width extraction from a raw flap-data staging table, one column per course type — `NEP_FLAP` shown as the example course):
```sql
INSERT INTO BARCODES(COURSE, FOLDER, BARCODE, PAPER_CODE, ROLLNO)
SELECT COURSE, FOLDER, BARCODE, PAPER_CODE, ROLLNO
FROM (
    SELECT 'NEP-II' COURSE, 'NEP_SEM_II_25_29' FOLDER,
           RTRIM(LTRIM(SUBSTRING(NEP_FLAP,41,11))) BARCODE,
           RTRIM(LTRIM(SUBSTRING(NEP_FLAP,52,12))) ROLLNO,
           RTRIM(LTRIM(SUBSTRING(NEP_FLAP,41,6)))  PAPER_CODE
    FROM NEP_FLAP
) V
WHERE V.BARCODE NOT LIKE '%*%'          -- discard bad/unscanned reads
GROUP BY COURSE, FOLDER, BARCODE, PAPER_CODE, ROLLNO
ORDER BY BARCODE;
```
Notes:
- `NEP_FLAP` here is the **staging table** that the raw `.DAT` file gets bulk-loaded into before parsing. Different courses will likely need different substring offsets/lengths and different staging tables/folder names — this needs to be a **configurable mapping** (course → offset config), not hardcoded, since more course types than NEP-II will exist.
- Commented-out lines in the original (`BARCODE IN(...)`, `BARCODE NOT IN(SELECT BARCODE FROM BARCODES)`) suggest the real production version should dedupe against already-imported barcodes — build this in as a standard "skip already-imported" check.

### 3.6 Award raw data — Stage 4 (⚠️ INCOMPLETE — see Open Questions)
Only described as: raw award data → temp table → formatting query → second temp table. No column list or query was provided yet, and it was later clarified that "award raw" files dropped on the shared drive may be **images**, not just structured text. This changes the design significantly (possible OCR requirement). **Do not start Phase 4 build until this is clarified** — see section 8.

---

## 4. System Components to Build

### 4.1 Online "Script Generator" API (hosted on the AWS Online server)
Minimal ASP.NET Core (.NET 8) API, small footprint, single purpose: run a predefined, parameterized query and return a script.

Endpoints:
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/script/regdata?papType=THEORY&session=...` | Runs the Stage 1 SELECT against `EXAM_MARKS`, returns generated INSERT script (or JSON rows) |
| `GET` | `/api/script/copycoding?admSession=...` | Runs the Stage 2 SELECT against `COPY_CODING`, returns generated script |
| `GET` | `/api/health` | Health check, used by the Offline API before attempting a sync |

Security: static API key in header (`X-Api-Key`), plus IP allow-list on the AWS security group restricted to the Offline machine's public IP if possible. Log every call (who/when/query) to a local file or table on the Online server.

Script generation approach: prefer returning **JSON rows** over raw SQL-script text where possible — it's safer (no SQL injection risk from string-built scripts) and easier for the Offline API to validate/transform before insert. Only fall back to literal SQL-script text if row volume makes JSON impractical.

### 4.2 Offline "Main" API (.NET 8)
This is the orchestrator and does the real work. Suggested project layout:
```
/src
  /ExamCorrection.Api          -> controllers/endpoints, DI wiring
  /ExamCorrection.Application  -> stage-specific services (RegDataSyncService, CopyCodingSyncService, BarcodeImportService, AwardImportService)
  /ExamCorrection.Infrastructure -> DB access (Dapper or EF Core), OnlineApiClient (HttpClient wrapper), FileWatcher/FileScanner
  /ExamCorrection.Domain       -> POCOs matching the schemas in section 3
```

Cross-cutting requirements for every stage:
- **Run log table** (Offline DB), e.g. `SYNC_RUN_LOG(ID, STAGE, STARTED_AT, FINISHED_AT, ROWS_READ, ROWS_INSERTED, ROWS_SKIPPED, STATUS, ERROR_MESSAGE, TRIGGERED_BY)`. Every stage run writes one row here — this is what the React dashboard reads to show history/status.
- **Idempotency**: every insert must check for existing records (by natural key — e.g. ENROLL_NO+PAPER_CODE for REGDATA, BARCODE for BARCODES) so re-running a stage doesn't duplicate rows. Prefer `MERGE` or "insert where not exists" patterns.
- **Preview-before-commit**: each stage should support a `?dryRun=true` mode that returns what *would* be inserted/updated without committing, so the React UI can show a diff/preview before the user confirms.

Endpoints:
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/stage1/regdata/sync?dryRun=` | Calls Online API for EXAM_MARKS data, transforms, loads into REGDATA |
| `POST` | `/api/stage2/copycoding/sync?dryRun=` | Calls Online API for COPY_CODING data, computes BCODE, loads |
| `GET`  | `/api/stage3/barcodes/pending-files` | Lists `.DAT` files sitting in the shared drive not yet imported |
| `POST` | `/api/stage3/barcodes/import` | Body: file name(s) or "all pending"; loads DAT → staging → parses → BARCODES |
| `GET`  | `/api/stage4/awards/pending-files` | Lists award raw files not yet processed (pending clarification of format) |
| `POST` | `/api/stage4/awards/import` | Processes award raw files (pending clarification) |
| `GET`  | `/api/runs?stage=&take=` | Returns run history for the dashboard |
| `GET`  | `/api/runs/{id}` | Run detail incl. any error message |

### 4.3 React Frontend
One dashboard page with a card per stage, plus a run-history view.

- **Stage card** shows: last run time/status, row counts from last run, a "Preview" button (dry run) and a "Run" button (commit), disabled state while a run is in progress.
- **Preview screen**: table of rows to be inserted/updated/skipped, with counts, before the user confirms commit.
- **Stage 3 & 4 cards** additionally show: list of pending files detected on the shared drive, with checkboxes to select which to import.
- **Run history page**: filterable table backed by `/api/runs`, click into a run for full detail/error.
- Suggested stack: React + TypeScript, TanStack Query for API calls/caching, a simple component library (or Tailwind, consistent with whatever the rest of the org uses) — keep it plain, this is an internal ops tool, not customer-facing.

---

## 5. Build Phases (build and ship in this order)

**Phase 0 — Scaffolding**
- Stand up the Offline .NET 8 API project skeleton + React project skeleton.
- Create `SYNC_RUN_LOG` table in Offline DB.
- Stand up the minimal Online Script Generator API on the AWS box, confirm the Offline machine can reach it over HTTPS with the API key (this is the riskiest unknown — validate first).

**Phase 1 — Stage 1: EXAM_MARKS → REGDATA**
- Confirm COURSE_ID/PCODE mapping (see 3.2 open question).
- Build Online endpoint `/api/script/regdata`.
- Build Offline `RegDataSyncService` with dry-run + commit + idempotency.
- Build the React "Stage 1" card + preview screen.

**Phase 2 — Stage 2: COPY_CODING sync + BCODE**
- Build Online endpoint `/api/script/copycoding`.
- Build Offline `CopyCodingSyncService` (insert then compute BCODE, or compute BCODE inline during insert).
- Extend React UI with the "Stage 2" card.

**Phase 3 — Stage 3: BARCODES flap import**
- Build a shared-drive file scanner (folder path configurable) that lists unprocessed `.DAT` files.
- Build the bulk-load-to-staging-table step (per-course config: which staging table, which substring offsets, folder/course label — make this data-driven, not hardcoded, since NEP-II is only one of presumably several course types).
- Build `BarcodeImportService` implementing the parse query in 3.5, with the "skip already in BARCODES" dedupe logic.
- Extend React UI with the "Stage 3" card + pending-files list.

**Phase 4 — Stage 4: Award data extraction**
- Blocked until the open questions in section 8 are answered (raw format, target schema, extraction rules).

---

## 6. Non-Functional Requirements

- **Auth**: the Offline API and React UI should sit behind whatever auth your org already uses internally (Windows/AD auth or a simple login) — this is an internal ops tool touching exam marks, treat it as sensitive.
- **Auditability**: every insert/update should be traceable to a run in `SYNC_RUN_LOG`, and ideally to the individual user who clicked "Run" in the UI.
- **No silent overwrites**: corrections should never blindly overwrite existing offline rows without a visible diff/preview, given this is explicitly a *correction* process, not a fresh load.
- **Idempotency**: re-running any stage twice must not create duplicate or conflicting data.
- **Config over hardcoding**: course-specific parsing rules (Stage 3, and likely Stage 4) must live in a config table or JSON config, not inline C# constants — new course types will be added over time.

---

## 7. Suggested Tech Stack Summary

| Layer | Choice |
|---|---|
| Online mini-API | ASP.NET Core Minimal API, .NET 8, hosted on the AWS Windows server (IIS or Kestrel + reverse proxy) |
| Offline API | ASP.NET Core Web API, .NET 8, Dapper (simplest for hand-tuned SQL like this) or EF Core if preferred |
| Offline DB access | SQL Server (LocalDB or full instance) |
| Frontend | React + TypeScript + TanStack Query |
| File handling | `System.IO` folder scan (polling, e.g. every N minutes, or on-demand "scan now" button) — a full `FileSystemWatcher` service is optional but polling is simpler and safer for a shared network drive |
| Auth between Online/Offline APIs | Static API key header, IP allow-list |

---

## 8. Open Questions (resolve before / during the relevant phase)

1. **Stage 1**: What is the source and derivation rule for `REGDATA.PCODE`? Confirm `COURSE_ID` comes straight from `EXAM_MARKS.COURSE_ID`.
2. **Stage 3**: Full list of course types (beyond NEP-II) and their staging table names + substring offset/length rules for BARCODE / ROLLNO / PAPER_CODE.
3. **Stage 3/4 file drop**: What's the naming convention for `.DAT` files and award files on the shared drive? Is there any way to tell "already imported" files apart from new ones other than checking against DB contents (e.g. do they get moved/renamed after processing)?
4. **Stage 4**: You mentioned award raw files may be **images** — please clarify:
   - Are these scanned award/marks sheets requiring OCR, or is "raw" award data actually structured (CSV/fixed-width/DB export) and the images are something separate (e.g. supporting scans, not the data source)?
   - What's the target schema (equivalent to BARCODES/REGDATA) that parsed award data should land in?
   - Do you have a sample raw award file/row and the intended extraction query, like you provided for Stages 1–3?
5. **Network path to AWS server**: Confirm the AWS security group can safely open a port for the Script Generator API, and confirm whether IT/security requires anything beyond an API key (e.g. mutual TLS, VPN).

---

## 9. Suggested Build Order for the Agent

Work strictly in this order, and don't start a phase's DB writes against real data until dry-run output has been eyeballed and approved:

1. Phase 0 scaffolding + connectivity check to AWS Script Generator API.
2. Phase 1 end-to-end (Online script endpoint → Offline sync service → React card), fully tested with dry-run before any live insert into REGDATA.
3. Phase 2 end-to-end, same pattern.
4. Phase 3 end-to-end — this one needs the course-config table built first since offsets differ per course.
5. Pause for Stage 4 clarification (section 8, item 4) before building Phase 4.
