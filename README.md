# NutriForge
## AI-Powered Pediatric Malnutrition Detection for India

### What This Is
NutriForge is an offline-first child growth assessment and nutrition-planning application for ASHA workers, caregivers, and NGO field teams. It combines deterministic anthropometric scoring, state-aware trajectory projection, optional local vision review, and budget-constrained meal planning into a single structured assessment workflow intended for decision support, not clinical diagnosis.

### Clinical Standards
- WHO 2006 Child Growth Standards using LMS-style z-score calculation
- UNICEF/WHO/WFP 2009 Joint Statement classification for SAM and MAM
- NFHS-5 (2019-21) state-level calibration for growth-risk trajectory projection
- MUAC-based SAM screening aligned to field practice and IMNCI-style workflows

### Architecture (Patent Reference)
NutriForge uses a five-node coordinator pipeline:

1. Node 1: Deterministic WHO Z-score engine
2. Node 2: NFHS-5 calibrated trajectory projection
3. Node 3: LLaVA vision nutritional signal extraction
4. Node 4: Regional context and food availability
5. Node 5: Budget-constrained forge plan generation

The novel contribution is the fusion coordinator that weights probabilistic vision outputs against deterministic anthropometric Z-scores, with regional NFHS-5 priors, to produce a unified risk-trajectory-action triple.

### Validation
To validate z-score behavior locally:

```bash
python3 backend/app/core/zscore_engine.py
```

Expected validation cases:
- Boy, 24 months, 9.0 kg, 84.0 cm
  - WAZ between `-3.1` and `-2.9`
  - HAZ between `-2.9` and `-2.7`
  - Classified as `mam_flag = True`
  - `referral_required = False`
- Girl, 12 months, 5.5 kg, 68.0 cm
  - WHZ below `-3`
  - `referral_required = True`
- Boy, 6 months, 7.5 kg, 67.0 cm
  - All z-scores near `0`
  - Normal growth range

### Data Sources
- WHO weight-for-age standards:
  - [WHO WFA page](https://www.who.int/toolkits/child-growth-standards/standards/weight-for-age)
  - Referenced download filenames: `wfa_boys_0-to-5-years_zscores.xlsx`, `wfa_girls_0-to-5-years_zscores.xlsx`
- WHO length/height-for-age standards:
  - [WHO LHFA page](https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age)
  - Referenced download filenames: `lhfa_boys_0-to-2-years_zscores.xlsx`, `lhfa_boys_2-to-5-years_zscores.xlsx`, `lhfa_girls_0-to-2-years_zscores.xlsx`, `lhfa_girls_2-to-5-years_zscores.xlsx`
- WHO weight-for-length/height standards:
  - [WHO WFL/WFH page](https://www.who.int/toolkits/child-growth-standards/standards/weight-for-length-height)
  - Referenced download filenames: `wfl_boys_0-to-2-years_zscores.xlsx`, `wfh_boys_2-to-5-years_zscores.xlsx`, `wfl_girls_0-to-2-years_zscores.xlsx`, `wfh_girls_2-to-5-years_zscores.xlsx`
- NFHS-5:
  - [NFHS-5 India report](http://rchiips.org/nfhs/NFHS-5_FCTS/India.pdf)
- Fallback meal plans:
  - Curated for NutriForge field use based on low-cost Indian household foods and ICMR-aligned feeding priorities

### Backend Setup (Production-aligned)

Create `.env` from `backend/.env.example` and set database + JWT secrets.
Use `RAG_BACKEND=lexical` for maximum demo stability, or `RAG_BACKEND=chroma` where Chroma native dependencies are supported.

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --reload-dir app --port 8000
```

Run migrations:

```bash
cd backend
alembic upgrade head
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Create `.env` from `frontend/.env.example`.

### Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run test
```

### Limitations
- Not validated in a clinical trial
- Vision analysis is supplementary only and never overrides anthropometry
- Requires further validation against real POSHAN 2.0 or programmatic field datasets before deployment
- Not a substitute for ASHA worker training or physician review

### Disclaimer
This software is not a medical device under CDSCO regulations. It is a decision-support tool for trained health workers.
