"""Fine-tune the shared MiniLM cross-encoder for the short-answer grader and the tutor reranker.

Usage: python train.py grader|reranker OUT_DIR
Only train and dev data are read here. The blind grader set and the test lessons are scored by eval/models.js.
"""
import hashlib, json, random, re, sys
from pathlib import Path

import numpy as np
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModelForSequenceClassification, AutoTokenizer

BASE = 'cross-encoder/ms-marco-MiniLM-L-6-v2'
HERE = Path(__file__).parent
GRADER = HERE.parent / 'grader'
POINTS = [
    'The answer says the client resends the original idempotency key on retry.',
    'The answer says the server returns the recorded result without applying the purchase again.',
]
tokenizer = AutoTokenizer.from_pretrained(BASE)
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
words = lambda text: set(re.findall(r'[a-z0-9]+', text.lower()))


def seed(value):
    random.seed(value); np.random.seed(value); torch.manual_seed(value)


def fit(pairs, labels, epochs, lr=3e-5, batch=16, value=7):
    seed(value)
    model = AutoModelForSequenceClassification.from_pretrained(BASE, num_labels=1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    order = list(range(len(pairs)))
    steps = epochs * ((len(order) + batch - 1) // batch)
    schedule = torch.optim.lr_scheduler.LambdaLR(optimizer, lambda step: min(1, (step + 1) / (0.1 * steps)) * max(0.0, 1 - step / steps))
    model.train()
    for _ in range(epochs):
        random.shuffle(order)
        for start in range(0, len(order), batch):
            idx = order[start:start + batch]
            enc = tokenizer([pairs[i][0] for i in idx], [pairs[i][1] for i in idx], truncation=True, max_length=256, padding=True, return_tensors='pt')
            loss = torch.nn.functional.binary_cross_entropy_with_logits(model(**enc).logits.squeeze(-1), torch.tensor([labels[i] for i in idx], dtype=torch.float))
            loss.backward(); optimizer.step(); schedule.step(); optimizer.zero_grad()
    return model.eval()


@torch.no_grad()
def score(model, pairs):
    out = []
    for start in range(0, len(pairs), 32):
        chunk = pairs[start:start + 32]
        enc = tokenizer([a for a, _ in chunk], [b for _, b in chunk], truncation=True, max_length=256, padding=True, return_tensors='pt')
        out += torch.sigmoid(model(**enc).logits.squeeze(-1)).tolist()
    return out


def onnx_scores(path, names, pairs):
    import onnxruntime
    session = onnxruntime.InferenceSession(str(path), providers=['CPUExecutionProvider'])
    out = []
    for a, b in pairs:
        enc = tokenizer(a, b, truncation=True, max_length=256, return_tensors='np')
        out.append(float(1 / (1 + np.exp(-session.run(None, {n: enc[n] for n in names})[0].reshape(-1)[0]))))
    return out


def export(model, directory, meta, probe):
    """Ship the smallest ONNX variant whose probabilities and decisions match the PyTorch model on the probe pairs."""
    directory = Path(directory); (directory / 'onnx').mkdir(parents=True, exist_ok=True)
    model.config.save_pretrained(directory); model.save_pretrained(directory / 'torch'); tokenizer.save_pretrained(directory)
    enc = tokenizer('a', 'b', return_tensors='pt')
    names = ['input_ids', 'attention_mask', 'token_type_ids']  # BERT.forward order; the tokenizer's order differs
    full = directory / 'onnx' / 'model.onnx'
    torch.onnx.export(model, tuple(enc[n] for n in names), full, input_names=names, output_names=['logits'], dynamo=False,
                      dynamic_axes={**{n: {0: 'batch', 1: 'seq'} for n in names}, 'logits': {0: 'batch'}}, opset_version=17)
    reference = score(model, probe)
    variants = {'int8-default': {}, 'int8-per-channel-matmul': {'per_channel': True, 'op_types_to_quantize': ['MatMul']}}
    report, chosen = {}, None
    for name, options in variants.items():
        path = directory / 'onnx' / 'model_quantized.onnx'
        quantize_dynamic(full, path, weight_type=QuantType.QInt8, **options)
        got = onnx_scores(path, names, probe)
        report[name] = {'meanAbsDiff': float(np.mean(np.abs(np.array(got) - reference))),
                        'decisionAgreement': float(np.mean([(a >= meta['threshold']) == (b >= meta['threshold']) for a, b in zip(got, reference)])),
                        'bytes': path.stat().st_size}
        if report[name]['meanAbsDiff'] < .02 and report[name]['decisionAgreement'] >= .98:
            chosen = name; break
        path.unlink()
    if chosen:
        full.unlink(); final = directory / 'onnx' / 'model_quantized.onnx'; meta['dtype'] = 'q8'
    else:
        final = full; meta['dtype'] = 'fp32'
    meta.update(onnxVariant=chosen or 'fp32', variantParity=report, onnxSha256=sha(final))
    (directory / 'classlyai.json').write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


def grader(out, extra=None):
    rows = [json.loads(line) for name in ('train', 'heldout') for line in (GRADER / f'{name}.jsonl').read_text().splitlines()]
    pairs = [(point, row['answer']) for row in rows for point in POINTS]
    labels = [row['points'][i] for row in rows for i in range(2)]
    folds = np.arange(len(rows)) % 5
    np.random.RandomState(0).shuffle(folds)
    cv = {}
    for epochs in (4, 8, 12):
        exact = 0
        for fold in range(5):
            tr = [i for r in range(len(rows)) if folds[r] != fold for i in (2 * r, 2 * r + 1)]
            te = [i for r in range(len(rows)) if folds[r] == fold for i in (2 * r, 2 * r + 1)]
            model = fit([pairs[i] for i in tr], [labels[i] for i in tr], epochs)
            pred = score(model, [pairs[i] for i in te])
            for k in range(0, len(te), 2):
                exact += (pred[k] >= .5) + (pred[k + 1] >= .5) == labels[te[k]] + labels[te[k + 1]]
        cv[epochs] = exact / len(rows)
        print('cv exact score', epochs, cv[epochs], flush=True)
    best = max(cv, key=cv.get)
    # Instructor-reviewed marks exported by export-labels.js join the final fit only; cross-validation stays on the original rows.
    extra_rows = [json.loads(line) for line in Path(extra).read_text().splitlines() if line.strip()] if extra else []
    final_pairs = pairs + [(row['criterion'], row['answer']) for row in extra_rows]
    final_labels = labels + [row['label'] for row in extra_rows]
    export(fit(final_pairs, final_labels, best), out, {
        'task': 'grader', 'base': BASE, 'points': POINTS, 'threshold': .5, 'epochs': best, 'cvExactScore': cv,
        'trainRows': len(rows), 'extraReviewedMarks': len(extra_rows), 'trainSha256': sha(GRADER / 'train.jsonl'), 'heldoutSha256': sha(GRADER / 'heldout.jsonl'),
        'blindSha256NotRead': (HERE / 'blind.sha256').read_text().split()[0]}, pairs[:60])


def reranker(out):
    corpus = json.loads((HERE / 'corpus.json').read_text())
    lessons = {split: [l for l in corpus['lessons'] if l['split'] == split] for split in ('train', 'dev')}
    flat = lambda split: [(l['id'], s) for l in lessons[split] for s in l['sections']]
    text = lambda s: f"{s['h']}. {s['t']}"
    train = flat('train')
    pairs, labels = [], []
    for lid, sec in train:
        for question in (sec['q'], sec['p']):
            others = [(l, s) for l, s in train if s is not sec]
            hard = sorted(others, key=lambda o: -len(words(question) & words(text(o[1]))))[:4]
            easy = random.Random(question).sample(others, 4)
            pairs.append((question, text(sec))); labels.append(1)
            for _, neg in {id(s): (l, s) for l, s in hard + easy + [o for o in others if o[0] == lid]}.values():
                pairs.append((question, text(neg))); labels.append(0)
    dev = flat('dev')
    dev_q = [(s['q'], s) for _, s in dev] + [(s['p'], s) for _, s in dev]
    dev_u = corpus['unsupported']['dev']

    def dev_metrics(model):
        sections = [c for _, c in dev]
        top = [score(model, [(question, text(c)) for c in sections]) for question, _ in dev_q]
        hit = [int(np.argmax(top[i]) == sections.index(dev_q[i][1])) for i in range(len(dev_q))]
        s_pos = [max(t) for t in top]
        s_neg = [max(score(model, [(q, text(c)) for c in sections])) for q in dev_u]
        best = max((sum(h and x >= t for h, x in zip(hit, s_pos)) + sum(x < t for x in s_neg), t) for t in np.arange(.05, .96, .01))
        return {'top1': float(np.mean(hit)), 'devAccuracy': best[0] / (len(dev_q) + len(dev_u)), 'threshold': float(round(best[1], 2))}
    results = {}
    for epochs in (1, 2, 3):
        model = fit(pairs, labels, epochs, lr=2e-5)
        results[epochs] = (dev_metrics(model), model)
        print('dev', epochs, results[epochs][0], flush=True)
    best = max(results, key=lambda e: (results[e][0]['devAccuracy'], results[e][0]['top1']))
    metrics, model = results[best]
    export(model, out, {'task': 'reranker', 'base': BASE, 'threshold': metrics['threshold'], 'epochs': best, 'dev': {str(e): r[0] for e, r in results.items()},
                        'trainPairs': len(pairs), 'corpusSha256': sha(HERE / 'corpus.json')},
           [(q, text(c)) for q, _ in dev_q for _, c in dev])


if __name__ == '__main__':
    {'grader': grader, 'reranker': reranker}[sys.argv[1]](*sys.argv[2:4])
