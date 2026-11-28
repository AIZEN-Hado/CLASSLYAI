# Local neural models: short-answer grader and tutor reranker

Both tasks fine-tune `cross-encoder/ms-marco-MiniLM-L-6-v2` (22M parameters, pretrained weights) with [train.py](train.py) and are served by [runtime.js](runtime.js) through `@huggingface/transformers` on ONNX CPU. No hosted LLM API is called anywhere in the ClasslyAI path.

## Reproduce

```sh
# On a machine with torch, transformers==4.46.3, onnx, onnxruntime, onnxscript:
python3 server/classlyai/models/train.py grader   server/classlyai/models/artifacts/grader
python3 server/classlyai/models/train.py reranker server/classlyai/models/artifacts/reranker
npm run eval:models --prefix server -- grader
npm run eval:models --prefix server -- reranker
```

`train.py` reads only train and dev data. It exports ONNX, quantizes to int8, and ships the int8 file only if it matches the PyTorch probabilities (mean difference under 0.02, 98% decision agreement); otherwise it ships fp32. Both shipped models are int8 (23 MB each). Parity is recorded in each `artifacts/*/classlyai.json`.

Training ran on Runpod pods (CPU path; the container's CUDA did not initialize). Total Runpod spend across all runs, including a discarded run with a broken ONNX export, was about $0.68 of the $1 cap by account balance. Every pod was terminated and no volume or endpoint was created. The shipped `config.json` files were copied from the reranker output because the pod's script version saved the config only under `torch/`; both models share one architecture config.

## Short-answer grader

- **Training data:** the 54 + 20 synthetic answers already in `../grader/` (74 rows, each scored as two rubric-point pairs). Epochs (12) were chosen by 5-fold cross-validation on those rows (exact score 0.57 / 0.62 / 0.64 for 4 / 8 / 12 epochs).
- **Blind set:** [blind.jsonl](blind.jsonl), 40 answers (10 per label pair, including negations, contradictions, paraphrases), written and hashed ([blind.sha256](blind.sha256)) before any training. `eval/models.js` refuses to run if the hash changes. It was not read by training.
- **Labels are synthetic, authored by the assistant. No independently instructor-marked answers exist in the repository, so marks stay advisory.**

| Blind set (40 answers) | Exact score | Exact rubric | False full credit | Missed full credit |
| --- | ---: | ---: | ---: | ---: |
| Keyword baseline | 22/40 (55%) | 22/40 | 0 | 8 |
| Previous MLP | 26/40 (65%) | 25/40 | 3 | 3 |
| Fine-tuned encoder (served) | 35/40 (87.5%) | 35/40 | 2 | 0 |

False full credit means two points awarded to an answer whose true score was below two. With 40 synthetic answers, one answer moves the rate by 2.5 points.

## Tutor reranker

- **Benchmark:** [corpus.json](corpus.json). 12 synthetic lessons (4 sections each) split by lesson before paraphrases were written: 8 train, 2 dev, 2 test. The two seeded demo lessons join the test pool with the nine labeled questions from `eval/run.js`. Test pool: 20 passages, 25 answerable questions, 7 unsupported questions.
- **Training:** 671 question-passage pairs from train lessons (positive plus same-lesson, lexical-hard and random negatives). Epoch count and abstention threshold (0.35) were chosen on the dev lessons only. Dev top-1 was 0.94 for every epoch setting, so the dev signal could not separate them; the one-epoch run was selected by tie-break.
- **Baselines:** `eval/models.js` implements keyword (idf-weighted term overlap) and hybrid (reciprocal-rank fusion of keyword and the fixture hash embedding) in JavaScript because the test pool lives outside PostgreSQL. The reranker reorders the hybrid top five. These are equivalents of, not the same code as, the PostgreSQL strategies; the real SQL strategies run on the seeded Neon demo via `npm run eval:classlyai`.

| Test lessons (25 answerable) | Top-1 | MRR@5 | Paraphrase top-1 |
| --- | ---: | ---: | ---: |
| Keyword | 0.84 | 0.90 | 0.75 |
| Hybrid | 0.72 | 0.84 | 0.50 |
| Hybrid + reranker (served) | 0.96 | 0.97 | 0.92 |

Recall@5 is 1.0 for all three because the pool is small. Abstention on the 7 unsupported questions: the reranker threshold abstained on 6 and wrongly answered 1; it answered 23 of 25 answerable questions with the correct top passage. The existing extractive rule on hybrid abstained on 7/7 but answered only 16/25 correctly.

In the tutor the reranker filters and orders the retrieved passages; the extractive answer step and `validateAnswer` still cite exact quotes from them, and an empty reranked set abstains. On the seeded Neon demo the tutor cited the expected section in 9/9 cases, abstained 3/3, and passed both isolation checks with no provider credentials.

## Limits

Synthetic, English-only data authored by one author; 12 lessons and a 20-passage test pool are small, and the author could see the test lessons when writing the corpus. The `corpusSha256` in `artifacts/reranker/classlyai.json` hashes the file before the seeded test questions were appended; train and dev content is unchanged. The `.onnx` files are 23 MB each.
