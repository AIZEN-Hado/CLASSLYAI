const model = require('./grader/model.json');

if (model.version !== 1) throw new Error('Unsupported ClasslyAI short-answer model version.');

function predictRubricScores(answer) {
    const words = answer.toLowerCase().replaceAll('’', "'").replaceAll("n't", ' not').match(/[a-z0-9]+/g) ?? [];
    const activeFeatures = new Set(words);
    for (let index = 1; index < words.length; index++) {
        activeFeatures.add(`${words[index - 1]} ${words[index]}`);
    }

    const hidden = [...model.hiddenBias];
    model.features.forEach((feature, index) => {
        if (!activeFeatures.has(feature)) return;
        const weights = model.hiddenWeights[index];
        for (let unit = 0; unit < hidden.length; unit++) hidden[unit] += weights[unit];
    });

    const activations = hidden.map(value => Math.tanh(value));
    return model.outputWeights.map((weights, point) => {
        const logit = model.outputBias[point] + weights.reduce((sum, weight, unit) => sum + weight * activations[unit], 0);
        return 1 / (1 + Math.exp(-logit));
    });
}

function gradeAnswer(answer) {
    const scores = predictRubricScores(answer);
    const points = model.points.map((point, index) => ({ ...point, awarded: scores[index] >= model.threshold }));
    return { score: points.filter(point => point.awarded).length, maxScore: points.length, points };
}

module.exports = { gradeAnswer, predictRubricScores, question: model.question };
