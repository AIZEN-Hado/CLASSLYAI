# Local neural models: short-answer grader and tutor reranker

Both tasks fine-tune `cross-encoder/ms-marco-MiniLM-L-6-v2` (22M parameters, pretrained weights) with [train.py](train.py) and are served by [runtime.js](runtime.js) through `@huggingface/transformers` on ONNX CPU. No hosted LLM API is called anywhere in the ClasslyAI path.

## Reproduce

```sh
# On a machine with torch, transformers==4.46.3, onnx, onnxruntime, onnxscript:
python3 server/classlyai/ml/train.py grader   server/classlyai/ml/artifacts/grader
python3 server/classlyai/ml/train.py reranker server/classlyai/ml/artifacts/reranker
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

## Drafting and checking for the ported Classly features

A pretrained Qwen2.5-1.5B-Instruct (ONNX, int4, not fine-tuned) runs locally through the same Transformers.js runtime. It downloads about 1.5 GB into the git-ignored `server/.cache/models` on first use, and one CPU job runs at a time.

- **Quiz drafting** (`quiz-generator.js`, `node classlyai/eval/models.js quiz`). Each draft must quote its answer from the lesson sentence, must not contain its answer or a dangling pronoun, must not use near-synonym distractors, and must be confirmed against the source passage by the reranker. On the six held-out lessons it drafted 8 of 12 requested questions, with 2 of 4 lessons getting a full three. The first, looser filter gave 12 of 12 but with visibly worse questions. Roughly 75 to 115 s per quiz. Nothing is published without an instructor.
- **Notes drafting** (`notes-generator.js`). One note per section, kept only if most content words appear in the section, otherwise the section's first sentence. One live run: 66 s for six sections, a mix of good notes and fallbacks. Unmeasured beyond that.
- **Answer checking for assignments** (`checker.js`, `node classlyai/eval/models.js checker`). The local model judges each rubric point yes or no; the fine-tuned encoder is a second opinion; a disagreement is flagged for the instructor. On 48 synthetic answers to four criteria the encoder never saw (24 meeting the criterion, authored by the assistant):

| Method | Accuracy | False credit | Missed credit |
| --- | ---: | ---: | ---: |
| Word overlap | 0.65 | 1 | 16 |
| Fine-tuned encoder, no new training | 0.90 | 3 | 2 |
| Local judge | 0.98 | 1 | 0 |

When judge and encoder agreed (42 of 48), all 42 marks were correct. The six disagreements were flagged and contained the judge's only error. In a live submission the judge awarded a point the answer never made, and the encoder disagreement flagged it for review. Marks stay advisory until an instructor confirms them. These are small synthetic sets, so read them as a signal, not an accuracy guarantee. A single submission takes about 30 s for three points.

### Learning from instructor decisions

Each time an instructor reviews a submission, the confirmed or overridden marks are kept. `npm run export:labels --prefix server > labels.jsonl` writes them as `{criterion, answer, label, changed}` lines. Retrain on a GPU or CPU pod with `python3 train.py grader OUT_DIR labels.jsonl`, which adds the reviewed marks to the final fit only. Ship the new model only if it does at least as well as the current one on the blind set (35 of 40 exact) and on `eval:models checker`. Nothing retrains or changes by itself, and no retraining run has happened yet because there are no real instructor labels.

## Choosing the quoted sentence in tutor answers

The tutor used to quote the sentence with the most word overlap with the question, behind a word-overlap rule that also decided whether to answer. It now scores each sentence of the top two retrieved passages with the trained reranker, quotes the best one (still an exact substring of the passage, checked by `validateAnswer`), and abstains when the best sentence scores below the reranker's threshold. `node classlyai/eval/models.js quote` compares the variants on 25 answerable and 7 unsupported questions from [quote-eval.json](quote-eval.json) (labels written by the assistant, so synthetic):

| Variant | Right sentence | False abstentions | Wrong sentence | Unsupported abstained |
| --- | ---: | ---: | ---: | ---: |
| Old word-overlap pick | 15 | 6 | 4 | 7 of 7 |
| Reranker behind the overlap rule | 16 | 6 | 3 | 7 of 7 |
| Reranker with its own threshold (shipped) | 18 | 1 | 6 | 7 of 7 |

Removing the overlap rule cut false abstentions on paraphrased questions from six to one without losing any correct abstention. The cost is more answered questions where the picked sentence is wrong or only partly answers, for example "How can the client recover the result after losing the server response?" still quotes "A client can lose the response after the server commits." because the reranker was trained on question-to-section pairs, not question-to-sentence pairs. Sentence-level training pairs would be the next improvement. The seeded Neon benchmark is unchanged: nine of nine sections cited, three of three abstentions, both isolation checks passed.

### Sentence-level retraining of the reranker

The shipped reranker was retrained from the same base with 440 extra sentence-level pairs (74 positives) on top of the 671 passage-level ones. [sentence-labels.json](sentence-labels.json) marks which sentence answers each train and dev question, and [sentence_data.py](sentence_data.py) builds the pairs (answering sentence as positive; the other sentence of the section, lexically close sentences from other sections, and random ones as negatives). The test lessons were not labelled for training. Epochs and the abstention threshold were chosen on the dev lessons only: passage top-1 and sentence top-1 were both 0.94 at every epoch count, so the tie went to one epoch, and the dev-chosen threshold moved from 0.35 to 0.63. The run took about two minutes of training on a rented community-cloud pod.

On the held-out lessons, passage-level results are unchanged (top-1 0.96, paraphrase top-1 0.92, 6 of 7 unsupported questions abstained, 23 of 25 answered correctly). Sentence picking, from `node classlyai/eval/models.js quote` over 25 answerable and 7 unsupported questions:

| Reranker | Right sentence | False abstentions | Wrong sentence | Unsupported abstained |
| --- | ---: | ---: | ---: | ---: |
| Question-to-section training only | 18 | 1 | 6 | 7 of 7 |
| Plus sentence-level pairs (shipped) | 19 | 2 | 4 | 7 of 7 |

Wrong quotes fell from six to four and correct quotes rose by one, but a false abstention also rose by one because the threshold moved. With 25 questions this is within noise. "How can the client recover the result after losing the server response?" still quotes the wrong sentence. The labels are synthetic and written by the assistant, and the dev set is only 16 questions, so more and independent sentence labels are the next improvement.
