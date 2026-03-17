const express = require('express');
const router = express.Router();
const multer = require('multer');
const { evaluateAnswer } = require('../controllers/evaluateController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', protect, upload.single('image'), evaluateAnswer);

module.exports = router;
