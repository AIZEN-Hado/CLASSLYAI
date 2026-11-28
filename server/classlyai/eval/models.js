// Scores the local neural models on data they never saw: the blind grader set and the held-out test lessons.
// Usage: node classlyai/eval/models.js grader|reranker
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { courses } = require('../../db/demo-classroom');
const { createEmbeddingProvider } = require('../embedding-provider');
const { predictRubricScores } = require('../short-answer-grader');
const { questionTerms } = require('../retrieval');
const { fixtureAnswer } = require('../tutor');
const { metadata, score } = require('../models/runtime');

const models = join(__dirname, '../models');
const round = number => Number(number.toFixed(3));
const sum = values => values.reduce((total, value) => total + value, 0);

async function gradeBlindSet() {
    const file = readFileSync(join(models, 'blind.jsonl'), 'utf8');
    const expectedHash = readFileSync(join(models, 'blind.sha256'), 'utf8').split(/\s+/)[0];
    const hash = createHash('sha256').update(file).digest('hex');
    if (hash !== expectedHash) throw new Error('The blind set changed after it was reserved.');
    const cases = file.trim().split('\n').map(line => JSON.parse(line));

    const { points } = await metadata('grader');
    const neural = await score('grader', cases.flatMap(({ answer }) => points.map(point => [point, answer])));
    const keyword = JSON.parse(execFileSync('python3', ['-B', '-c', `
import json, sys
from grader import keyword_grader
print(json.dumps([keyword_grader(answer) for answer in json.loads(sys.argv[1])]))
`, JSON.stringify(cases.map(({ answer }) => answer))], { cwd: join(__dirname, '../grader'), encoding: 'utf8' }));

    const methods = {
        keywordBaseline: cases.map((_, index) => keyword[index]),
        previousNeural: cases.map(({ answer }) => predictRubricScores(answer).map(value => Number(value >= 0.5))),
        fineTunedEncoder: cases.map((_, index) => points.map((_, point) => Number(neural[index * points.length + point] >= 0.5)))
    };
    const report = { blindSetSha256: hash, examples: cases.length, labelSource: 'synthetic, authored by the assistant; not instructor-marked' };
    for (const [name, predictions] of Object.entries(methods)) {
        const totals = predictions.map(prediction => sum(prediction));
        const expected = cases.map(({ points: marks }) => sum(marks));
        report[name] = {
            exactScoreCorrect: totals.filter((total, index) => total === expected[index]).length,
            exactRubricCorrect: predictions.filter((prediction, index) => prediction.every((mark, point) => mark === cases[index].points[point])).length,
            falseFullCredit: totals.filter((total, index) => total === 2 && expected[index] < 2).length,
            missedFullCredit: totals.filter((total, index) => total < 2 && expected[index] === 2).length
        };
    }
    return report;
}

function lessonSections(markdown) {
    return markdown.split(/^## /m).slice(1).map(block => {
        const [heading, ...body] = block.split('\n');
        return { h: heading.trim(), t: body.join('\n').trim() };
    });
}

function testPool() {
    const corpus = JSON.parse(readFileSync(join(models, 'corpus.json'), 'utf8'));
    const passages = [];
    const questions = [];
    for (const lesson of corpus.lessons.filter(item => item.split === 'test')) {
        for (const section of lesson.sections) {
            passages.push({ lesson: lesson.id, section: section.h, text: section.t });
            questions.push({ kind: 'exact', question: section.q, lesson: lesson.id, section: section.h }, { kind: 'paraphrase', question: section.p, lesson: lesson.id, section: section.h });
        }
    }
    for (const { lesson } of courses) {
        for (const section of lessonSections(lesson.markdown)) passages.push({ lesson: lesson.slug, section: section.h, text: section.t });
    }
    for (const item of corpus.seeded.questions) {
        questions.push({ kind: item.q ? 'exact' : 'paraphrase', question: item.q ?? item.p, lesson: item.lesson, section: item.section });
    }
    for (const question of [...corpus.unsupported.test, ...corpus.seeded.unsupported]) questions.push({ kind: 'unsupported', question });
    return { passages, questions, corpusSha256: createHash('sha256').update(JSON.stringify(corpus)).digest('hex') };
}

// JavaScript equivalents of the two retrieval strategies, used because the benchmark pool lives outside PostgreSQL.
function firstStage(passages, vectors, question, questionVector) {
    const terms = questionTerms(question);
    const documents = passages.map(passage => new Set(questionTerms(`${passage.section} ${passage.text}`)));
    const lexical = passages.map((_, index) => ({
        index,
        score: sum(terms.filter(term => documents[index].has(term)).map(term => Math.log(1 + passages.length / documents.filter(document => document.has(term)).length)))
    })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
    const semantic = passages.map((_, index) => ({ index, score: sum(vectors[index].map((value, dimension) => value * questionVector[dimension])) }))
        .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
    const fused = new Map();
    for (const list of [lexical.slice(0, 10), semantic.slice(0, 10)]) list.forEach((item, rank) => fused.set(item.index, (fused.get(item.index) ?? 0) + 1 / (61 + rank)));
    return {
        keyword: lexical.slice(0, 5).map(item => item.index),
        hybrid: [...fused].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 5).map(item => item[0])
    };
}

async function rankTestLessons() {
    const { passages, questions, corpusSha256 } = testPool();
    const embeddings = createEmbeddingProvider();
    const texts = passages.map(passage => `${passage.section}. ${passage.text}`);
    const [vectors, questionVectors] = await Promise.all([embeddings.embed(passages.map(passage => passage.text)), embeddings.embed(questions.map(item => item.question))]);
    const { threshold } = await metadata('reranker');
    const runs = [];
    for (const [number, item] of questions.entries()) {
        const stage = firstStage(passages, vectors, item.question, questionVectors[number]);
        const scores = await score('reranker', stage.hybrid.map(index => [item.question, texts[index]]));
        const order = stage.hybrid.map((index, position) => ({ index, value: scores[position] })).sort((a, b) => b.value - a.value);
        const answerable = item.kind !== 'unsupported';
        const target = answerable ? passages.findIndex(passage => passage.lesson === item.lesson && passage.section === item.section) : -1;
        const fixture = fixtureAnswer(item.question, stage.hybrid.map(index => ({ id: String(index), excerpt: passages[index].text, section: passages[index].section })));
        runs.push({
            ...item, keyword: stage.keyword.indexOf(target) + 1, hybrid: stage.hybrid.indexOf(target) + 1,
            reranked: order.findIndex(candidate => candidate.index === target) + 1,
            hybridAnswers: fixture.status === 'answered', rerankerAnswers: order[0].value >= threshold, rerankerTopCorrect: order[0].index === target
        });
    }

    const answerable = runs.filter(run => run.kind !== 'unsupported');
    const unsupported = runs.filter(run => run.kind === 'unsupported');
    const summary = (subset, field) => ({
        top1: round(subset.filter(run => run[field] === 1).length / subset.length),
        recallAt5: round(subset.filter(run => run[field] > 0).length / subset.length),
        mrrAt5: round(sum(subset.map(run => (run[field] ? 1 / run[field] : 0))) / subset.length)
    });
    return {
        corpusSha256, passages: passages.length, answerable: answerable.length, unsupported: unsupported.length, abstentionThreshold: threshold,
        ranking: Object.fromEntries(['keyword', 'hybrid', 'reranked'].map(field => [field, {
            all: summary(answerable, field), paraphrase: summary(answerable.filter(run => run.kind === 'paraphrase'), field)
        }])),
        abstention: {
            hybridWithExtractiveRule: { correctAbstentions: unsupported.filter(run => !run.hybridAnswers).length, answeredCorrectly: answerable.filter(run => run.hybridAnswers && run.hybrid === 1).length },
            reranker: { correctAbstentions: unsupported.filter(run => !run.rerankerAnswers).length, answeredCorrectly: answerable.filter(run => run.rerankerAnswers && run.rerankerTopCorrect).length }
        },
        misses: answerable.filter(run => run.reranked !== 1).map(({ question, section, reranked }) => ({ question, section, rank: reranked }))
    };
}

// Yield of the quiz drafter on the held-out lessons. Every kept question is quoted from the lesson and passes the reranker;
// whether a question is good still needs an instructor's reading, so the questions are printed for review.
async function draftQuizzes() {
    const { generateQuiz, modelId } = require('../models/quiz-generator');
    const corpus = JSON.parse(readFileSync(join(models, 'corpus.json'), 'utf8'));
    const lessons = [
        ...corpus.lessons.filter(item => item.split === 'test').map(item => ({ id: item.id, markdown: item.sections.map(section => `## ${section.h}\n\n${section.t}`).join('\n\n') })),
        ...courses.map(({ lesson }) => ({ id: lesson.slug, markdown: lesson.markdown }))
    ];
    const report = { model: modelId, wanted: 3, lessons: [] };
    for (const lesson of lessons) {
        const started = Date.now();
        const questions = await generateQuiz(lesson.markdown, { count: 3 });
        report.lessons.push({
            lesson: lesson.id, drafted: questions.length, seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
            questions: questions.map(({ prompt, options, correct, relevance }) => ({ prompt, answer: options[correct], options, relevance }))
        });
    }
    report.totalDrafted = report.lessons.reduce((total, item) => total + item.drafted, 0);
    report.lessonsWithFullQuiz = report.lessons.filter(item => item.drafted === 3).length;
    return report;
}

async function main() {
    const task = process.argv[2];
    if (!['grader', 'reranker', 'quiz'].includes(task)) throw new Error('Usage: node classlyai/eval/models.js grader|reranker|quiz');
    const run = { grader: gradeBlindSet, reranker: rankTestLessons, quiz: draftQuizzes }[task];
    console.log(JSON.stringify(await run(), null, 2));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
