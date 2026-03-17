const asyncHandler = require('express-async-handler');
const Tesseract = require('tesseract.js');
const TeacherAIConfig = require('../models/TeacherAIConfig');
const { callChat } = require('../services/aiService');
const { decrypt } = require('../utils/encryption');

// ─── Helper: get teacher's decrypted config ─────────────────────────
async function getTeacherAI(userId) {
    const config = await TeacherAIConfig.findOne({ teacher: userId, isActive: true });
    if (!config) {
        const err = new Error('No AI configuration found. Please set up your API key in AI Settings.');
        err.statusCode = 400;
        throw err;
    }
    const apiKey = decrypt(config.apiKey);
    return { apiKey, provider: config.provider, model: config.model };
}

// ─── Evaluate Answer ──────────────────────────────────────────────────
// POST /api/evaluate
const evaluateAnswer = asyncHandler(async (req, res) => {
    const { contextQuestion, expectedAnswer } = req.body;
    const file = req.file;

    if (!contextQuestion) {
         res.status(400);
         throw new Error('Context question is required');
    }

    if (!file) {
        res.status(400);
        throw new Error('Image file of the handwritten answer is required');
    }

    // Attempt to get user's AI config. We assume the user is authenticated.
    const { apiKey, provider, model } = await getTeacherAI(req.user._id);

    // 1. Perform OCR extraction
    let extractedText = '';
    try {
        const { data: { text } } = await Tesseract.recognize(
            file.buffer,
            'eng',
            { logger: m => console.log('Tesseract OCR Progress:', m) }
        );
        extractedText = text;
    } catch (error) {
         res.status(500);
         throw new Error(`OCR processing failed: ${error.message}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
        res.status(400);
        throw new Error('Could not extract any text from the provided image. Please ensure the handwriting is legible.');
    }

    // 2. Perform AI Evaluation
    const systemPrompt = `You are a reliable and strict answer evaluator and plagiarism checker.

Your goal is to evaluate the provided student's answer text. You MUST output a valid JSON response containing the properties:
- isPlagiarized: (boolean) Whether the student's answer seems heavily copied from general textbook answers, internet sources, or lacks original thought.
- plagiarismScore: (number 0-100) indicating confidence of plagiarism.
- evaluationScore: (number 0-100) indicating how correct the answer is.
- remarks: (string) A detailed but concise paragraph analyzing the student's answer, pointing out what was good, what was missing, and if it showed signs of plagiarism.

Output MUST be strictly JSON. No markdown wrappers.`;

    const userPrompt = `Context Question: ${contextQuestion}
${expectedAnswer ? `Expected Rubric/Answer: ${expectedAnswer}\n` : ''}
Student's Extracted Answer Text:
"${extractedText}"

Evaluate the student's answer. Remember, output strictly raw JSON matching the required schema.`;

    let evaluationResult = null;
    try {
        const aiResponse = await callChat(provider, apiKey, model, systemPrompt, userPrompt);
        console.log("Raw AI Response:", aiResponse);
        
        let jsonStr = aiResponse.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
             // Handle case where it is directly an object but has some trailing space
             jsonStr = jsonStr;
        } else {
             // Find the first { and last }
             const firstBrace = jsonStr.indexOf('{');
             const lastBrace = jsonStr.lastIndexOf('}');
             if (firstBrace !== -1 && lastBrace !== -1) {
                 jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
             }
        }
        
        console.log("Cleaned JSON String:", jsonStr);
        evaluationResult = JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Evaluation Error:", error);
        res.status(502);
        throw new Error(`AI evaluation failed or returned invalid format: ${error.message}`);
    }

    // 3. Return results
    res.json({
        success: true,
        extractedText: extractedText.trim(),
        evaluation: evaluationResult
    });
});

module.exports = { evaluateAnswer };
