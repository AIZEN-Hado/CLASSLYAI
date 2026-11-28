# Local short-answer grader experiment

> This is the earlier standard-library network, kept as a baseline. The served grader is the fine-tuned encoder described in [../models/README.md](../models/README.md).

This experiment scores one question from the seeded Reliable Backend Systems course.

> A purchase commits, but the client loses the response. What should the client send on retry, and how should the server respond?

Award one point for sending the original idempotency key and one point for returning the recorded result without applying the purchase again. The two labels are independent. For example, an answer that reuses the key and mentions preventing duplicate charges, but omits returning the recorded result, earns one point. The labels come from synthetic answers authored for this experiment.

## Reproduce the run

From the repository root, use Python 3.10 or newer. Training and inference use the standard library on CPU and require no database, network, or API credentials.

```sh
python3 server/classlyai/grader/grader.py train --model /tmp/classlyai-grader-model.json > /tmp/classlyai-grader-report.json
cmp /tmp/classlyai-grader-model.json server/classlyai/grader/model.json
cat /tmp/classlyai-grader-report.json
python3 server/classlyai/grader/grader.py infer --model /tmp/classlyai-grader-model.json \
  'Reuse the original idempotency key and return the saved response without performing another purchase.'
```

The 20 KB JSON model records the prompt, rubric, vocabulary, layer weights, biases, and threshold. The run report records the recipe, split sizes, SHA-256 hashes, label counts, and held-out errors by line number.

## Method and held-out results

The fixed-seed multilayer perceptron uses binary word and adjacent-word features, an eight-unit tanh hidden layer, and two sigmoid outputs. The script learns vocabulary and weights from 54 answers in [train.jsonl](train.jsonl). It evaluates the exported artifact at a fixed 0.5 threshold against 20 separately authored answers in [heldout.jsonl](heldout.jsonl), five for each label pair. The held-out set contains novel phrasing, partial answers, and explicit negations. The keyword baseline uses fixed term groups for reusing a key and replaying a stored result without reprocessing. Both methods score the same 20 answers.

| Held-out measure | Keyword baseline | Neural model |
| --- | ---: | ---: |
| Reuse-key decisions correct | 13/20 (65%) | 14/20 (70%) |
| Replay-result decisions correct | 13/20 (65%) | 14/20 (70%) |
| Exact rubric (both decisions correct) | 10/20 (50%) | 10/20 (50%) |
| Exact score (correct total out of two) | 11/20 (55%) | 10/20 (50%) |

The neural model correctly rejected “Do not send the original idempotency key. Do not return the saved result.” It awarded full credit to “Make a new key and perform the purchase again.” It also missed the reuse point in “The first call's token should be copied verbatim.” The model improved individual point accuracy by one answer per point, tied on exact rubric, and scored one fewer total correctly. Its model scores are uncalibrated.

These results cover one English-language question and a small synthetic holdout. The model is suitable for demonstrating the training and feedback workflow. Student grading would require a larger, independently labeled evaluation with authentic answers and stronger performance on negation, paraphrases, and contradictory claims.

## Runpod reproduction

On 2026-11-28 a two-vCPU Runpod CPU3 compute pod ran the training script with the two JSONL splits using Python 3.12. Its exported model matched the local checkpoint byte for byte (SHA-256 `6d00317a0675b26b259aa3f4de2e5ec8ee4a4e273717c5237057b3e5118b53b2`). The audit log records creation at 01:34:15 UTC and deletion at 01:34:51 UTC. At $0.06/hour, 36 seconds corresponds to $0.0006 of estimated compute. No persistent volume or endpoint was created.
