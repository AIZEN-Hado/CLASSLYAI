#!/usr/bin/env python3
"""Train and run a two-point short-answer classifier using the standard library."""

import argparse
import hashlib
import json
import math
import random
import re
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
QUESTION = (
    "A purchase commits, but the client loses the response. "
    "What should the client send on retry, and how should the server respond?"
)
POINTS = [
    {"id": "reuse-key", "description": "Reuse the original idempotency key."},
    {
        "id": "replay-result",
        "description": "Return the recorded result without applying the purchase again.",
    },
]
SEED = 2026
EPOCHS = 75
HIDDEN_SIZE = 8
LEARNING_RATE = 0.05
MIN_FEATURE_COUNT = 2
TOKEN = re.compile(r"[a-z0-9]+")


def tokens(answer):
    return TOKEN.findall(answer.lower().replace("’", "'").replace("n't", " not"))


def features(answer):
    words = tokens(answer)
    return set(words) | {f"{left} {right}" for left, right in zip(words, words[1:])}


def vector(answer, vocabulary):
    return sorted(vocabulary[feature] for feature in features(answer) if feature in vocabulary)


def sigmoid(value):
    if value >= 0:
        return 1 / (1 + math.exp(-value))
    exponent = math.exp(value)
    return exponent / (1 + exponent)


def forward(model, active):
    hidden = model["hiddenBias"].copy()
    for feature in active:
        for unit, weight in enumerate(model["hiddenWeights"][feature]):
            hidden[unit] += weight
    hidden = [math.tanh(value) for value in hidden]
    scores = [
        sigmoid(bias + sum(weight * value for weight, value in zip(weights, hidden)))
        for weights, bias in zip(model["outputWeights"], model["outputBias"])
    ]
    return hidden, scores


def train(examples):
    counts = Counter(feature for case in examples for feature in features(case["answer"]))
    names = sorted(feature for feature, count in counts.items() if count >= MIN_FEATURE_COUNT)
    vocabulary = {feature: index for index, feature in enumerate(names)}
    randomizer = random.Random(SEED)
    samples = [(vector(case["answer"], vocabulary), case["points"]) for case in examples]
    model = {
        "version": 1,
        "question": QUESTION,
        "points": POINTS,
        "features": names,
        "hiddenWeights": [
            [randomizer.uniform(-0.12, 0.12) for _ in range(HIDDEN_SIZE)] for _ in names
        ],
        "hiddenBias": [0.0] * HIDDEN_SIZE,
        "outputWeights": [
            [randomizer.uniform(-0.12, 0.12) for _ in range(HIDDEN_SIZE)] for _ in POINTS
        ],
        "outputBias": [0.0] * len(POINTS),
        "threshold": 0.5,
    }
    for _ in range(EPOCHS):
        randomizer.shuffle(samples)
        for active, expected in samples:
            hidden, scores = forward(model, active)
            # Sigmoid with binary cross-entropy gives a score minus target logit gradient.
            output_gradients = [score - target for score, target in zip(scores, expected)]
            hidden_gradients = [
                (1 - value * value) * sum(
                    model["outputWeights"][point][unit] * gradient
                    for point, gradient in enumerate(output_gradients)
                )
                for unit, value in enumerate(hidden)
            ]
            for point, gradient in enumerate(output_gradients):
                model["outputBias"][point] -= LEARNING_RATE * gradient
                for unit, value in enumerate(hidden):
                    model["outputWeights"][point][unit] -= LEARNING_RATE * gradient * value
            for unit, gradient in enumerate(hidden_gradients):
                update = LEARNING_RATE * gradient
                model["hiddenBias"][unit] -= update
                for feature in active:
                    model["hiddenWeights"][feature][unit] -= update

    for name in ("hiddenWeights", "outputWeights"):
        model[name] = [[round(value, 8) for value in row] for row in model[name]]
    for name in ("hiddenBias", "outputBias"):
        model[name] = [round(value, 8) for value in model[name]]
    return model


def neural_grader(model):
    vocabulary = {feature: index for index, feature in enumerate(model["features"])}

    def predict(answer):
        _, scores = forward(model, vector(answer, vocabulary))
        return [int(score >= model["threshold"]) for score in scores], scores

    return predict


def keyword_grader(answer):
    words = set(tokens(answer))
    reuse = words & {"reuse", "same", "original", "unchanged", "identical", "existing"}
    key = words & {"key", "token", "identifier"}
    replay = words & {"return", "returns", "replay", "replays", "respond", "reply", "send"}
    recorded = words & {"stored", "saved", "first", "prior", "previous", "original", "cached", "recorded"}
    result = words & {"response", "result", "outcome", "receipt", "confirmation"}
    no_repeat = words & {"without", "instead", "skip", "skips", "avoid", "avoiding", "no"}
    return [int(bool(reuse and key)), int(bool(replay and recorded and result and no_repeat))]


def load_examples(path):
    examples = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        case = json.loads(line)
        if (
            not isinstance(case.get("answer"), str)
            or not case["answer"].strip()
            or case.get("points") not in ([0, 0], [0, 1], [1, 0], [1, 1])
        ):
            raise ValueError(f"{path}:{number} must contain an answer and two binary points")
        examples.append(case)
    if not examples:
        raise ValueError(f"{path} is empty")
    return examples


def dataset_summary(path, examples):
    return {
        "examples": len(examples),
        "labelCounts": dict(sorted(Counter("".join(map(str, case["points"])) for case in examples).items())),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def metrics(heldout, predict):
    comparisons = [(case["points"], predict(case["answer"])) for case in heldout]
    per_point = {}
    for index, point in enumerate(POINTS):
        pairs = [(expected[index], actual[index]) for expected, actual in comparisons]
        true_positives = sum(expected == actual == 1 for expected, actual in pairs)
        false_positives = sum(expected == 0 and actual == 1 for expected, actual in pairs)
        false_negatives = sum(expected == 1 and actual == 0 for expected, actual in pairs)
        per_point[point["id"]] = {
            "correct": sum(expected == actual for expected, actual in pairs),
            "truePositives": true_positives,
            "falsePositives": false_positives,
            "falseNegatives": false_negatives,
        }
    return {
        "examples": len(heldout),
        "perPoint": per_point,
        "exactRubricCorrect": sum(expected == actual for expected, actual in comparisons),
        "exactScoreCorrect": sum(sum(expected) == sum(actual) for expected, actual in comparisons),
        "rubricErrors": [
            {"line": index, "expected": expected, "predicted": actual}
            for index, (expected, actual) in enumerate(comparisons, 1)
            if expected != actual
        ],
    }


def experiment(model_path):
    train_path = HERE / "train.jsonl"
    heldout_path = HERE / "heldout.jsonl"
    examples = load_examples(train_path)
    heldout = load_examples(heldout_path)
    if {tuple(tokens(case["answer"])) for case in examples} & {
        tuple(tokens(case["answer"])) for case in heldout
    }:
        raise ValueError("Training and held-out sets contain an identical normalized answer")

    model = train(examples)
    model_path.write_text(json.dumps(model, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
    predict = neural_grader(json.loads(model_path.read_text(encoding="utf-8")))
    return {
        "training": {
            "seed": SEED,
            "epochs": EPOCHS,
            "learningRate": LEARNING_RATE,
            "hiddenSize": HIDDEN_SIZE,
            "features": len(model["features"]),
            "minimumFeatureCount": MIN_FEATURE_COUNT,
            **dataset_summary(train_path, examples),
        },
        "heldout": {
            **dataset_summary(heldout_path, heldout),
            "keyword": metrics(heldout, keyword_grader),
            "neural": metrics(heldout, lambda answer: predict(answer)[0]),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    train_parser = commands.add_parser("train", help="write a model and print the held-out comparison")
    train_parser.add_argument("--model", required=True, type=Path)
    infer_parser = commands.add_parser("infer", help="score one answer using a saved model")
    infer_parser.add_argument("--model", required=True, type=Path)
    infer_parser.add_argument("answer")
    args = parser.parse_args()
    if args.command == "train":
        result = experiment(args.model)
    else:
        model = json.loads(args.model.read_text(encoding="utf-8"))
        if model.get("version") != 1:
            parser.error("unsupported model version")
        points, scores = neural_grader(model)(args.answer)
        result = {
            "score": sum(points),
            "maxScore": len(points),
            "points": [
                {**point, "awarded": bool(value), "modelScore": round(score, 6)}
                for point, value, score in zip(model["points"], points, scores)
            ],
        }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
