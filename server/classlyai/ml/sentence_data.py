"""Sentence-level training pairs for the tutor reranker. Plain Python, so the data can be checked without torch."""
import json
import random
import re
from pathlib import Path

HERE = Path(__file__).parent
words = lambda text: set(re.findall(r'[a-z0-9]+', text.lower()))
split_sentences = lambda text: [s for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s]


def load(split):
    corpus = json.loads((HERE / 'corpus.json').read_text())
    labels = json.loads((HERE / 'sentence-labels.json').read_text())['lessons']
    sections = []  # (lesson id, heading, sentences, [(question, accepted indexes), ...])
    for lesson in (l for l in corpus['lessons'] if l['split'] == split):
        marks = labels[lesson['id']]
        assert len(marks) == len(lesson['sections']), lesson['id']
        for section, (q_ok, p_ok) in zip(lesson['sections'], marks):
            sentences = split_sentences(section['t'])
            assert len(sentences) == 2, (lesson['id'], section['h'], sentences)
            assert all(i in (0, 1) for i in q_ok + p_ok) and q_ok and p_ok, (lesson['id'], section['h'])
            sections.append((lesson['id'], section['h'], sentences, [(section['q'], q_ok), (section['p'], p_ok)]))
    return sections


def sentence_pairs(split):
    """Positives are the answering sentences. Negatives: the other sentence of the section, lexically close
    sentences from other sections, and a few random ones."""
    sections = load(split)
    pool = [(i, h, s) for i, (_, h, sentences, _) in enumerate(sections) for s in sentences]
    pairs, labels = [], []
    for index, (_, heading, sentences, questions) in enumerate(sections):
        for question, accepted in questions:
            for position, sentence in enumerate(sentences):
                pairs.append((question, f'{heading}. {sentence}'))
                labels.append(int(position in accepted))
            others = [(h, s) for i, h, s in pool if i != index]
            close = sorted(others, key=lambda item: -len(words(question) & words(item[1])))[:3]
            far = random.Random(question).sample(others, 2)
            for h, s in {(h, s): None for h, s in close + far}:
                pairs.append((question, f'{h}. {s}'))
                labels.append(0)
    return pairs, labels


def eval_items(split):
    """Each question with every sentence of the split as candidates, and which candidates answer it."""
    sections = load(split)
    texts, owner = [], []
    for index, (_, heading, sentences, _) in enumerate(sections):
        for position, sentence in enumerate(sentences):
            texts.append(f'{heading}. {sentence}')
            owner.append((index, position))
    items = []
    for index, (_, _, _, questions) in enumerate(sections):
        for question, accepted in questions:
            items.append((question, texts, {k for k, (i, p) in enumerate(owner) if i == index and p in accepted}))
    return items


if __name__ == '__main__':
    for split in ('train', 'dev'):
        pairs, labels = sentence_pairs(split)
        items = eval_items(split)
        print(split, 'sections', len(load(split)), '| pairs', len(pairs), '| positives', sum(labels), '| eval questions', len(items), '| candidates each', len(items[0][1]))
