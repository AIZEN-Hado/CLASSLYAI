import React, { useState } from 'react';
import { FiUploadCloud, FiFileText, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';

const AnswerChecker = () => {
  const [contextQuestion, setContextQuestion] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null); // Clear previous results when a new image is loaded
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contextQuestion.trim()) {
      toast.error('Context question is required');
      return;
    }
    if (!imageFile) {
      toast.error('Please upload an image of the handwritten answer');
      return;
    }

    const formData = new FormData();
    formData.append('contextQuestion', contextQuestion);
    formData.append('expectedAnswer', expectedAnswer);
    formData.append('image', imageFile);

    try {
      setLoading(true);
      const res = await api.post('/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResult(res.data);
      toast.success('Evaluation complete!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Evaluation failed. Make sure you have configured your AI API key in Settings.');
      console.error('Eval error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Handwritten Answer Evaluator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upload an image of a handwritten answer. Our AI will extract the text, analyze it for plagiarism, and grade it against your question.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Context Question */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Context Question <span className="text-red-500">*</span>
              </label>
              <textarea
                value={contextQuestion}
                onChange={(e) => setContextQuestion(e.target.value)}
                placeholder="e.g., Explain the process of photosynthesis."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
                required
              />
            </div>

            {/* Expected Answer/Rubric (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Expected Answer / Rubric (Optional)
              </label>
              <textarea
                value={expectedAnswer}
                onChange={(e) => setExpectedAnswer(e.target.value)}
                placeholder="Optional: Provide the expected answer or key points to guide the grading."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Handwritten Answer Image <span className="text-red-500">*</span>
              </label>
              
              {!previewUrl ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-center flex flex-col items-center">
                    <FiUploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 dark:text-slate-400">
                      <span className="relative rounded-md font-medium text-blue-600 dark:text-blue-400">
                        Upload an image
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      PNG, JPG, JPEG up to 5MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group max-h-64 flex justify-center bg-slate-100 dark:bg-slate-800">
                  <img src={previewUrl} alt="Preview" className="object-contain h-full" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !imageFile || !contextQuestion.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Answer...
                </>
              ) : (
                <>
                  <FiCheckCircle size={20} />
                  Evaluate Now
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Results */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-full min-h-[500px]">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
            <FiFileText className="text-blue-500" /> Evaluation Results
          </h2>
          
          {!result && !loading && (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-center">
                 <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <FiCheckCircle className="text-slate-300 dark:text-slate-600" size={32} />
                 </div>
                 <p>Upload an image and hit evaluate to see the AI analysis here.</p>
             </div>
          )}

          {loading && (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-center space-y-4">
                 <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
                 <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200">Processing Document</p>
                    <p className="text-sm mt-1">Extracting text via OCR and running AI analysis...</p>
                 </div>
             </div>
          )}

          {result && !loading && (
             <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                     <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Grade Score</p>
                     <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {result.evaluation?.evaluationScore}<span className="text-lg text-slate-500 font-normal">/100</span>
                     </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl border ${
                    result.evaluation?.isPlagiarized 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30' 
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                  }`}>
                     <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${result.evaluation?.isPlagiarized ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                           Plagiarism Risk
                        </p>
                        {result.evaluation?.isPlagiarized && <FiAlertTriangle className="text-red-500" />}
                     </div>
                     <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {result.evaluation?.plagiarismScore}<span className="text-lg text-slate-500 font-normal">%</span>
                     </div>
                     <p className={`text-xs mt-1 ${result.evaluation?.isPlagiarized ? 'text-red-500' : 'text-green-500'}`}>
                        {result.evaluation?.isPlagiarized ? 'High suspicion of copying' : 'Seems original'}
                     </p>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                   <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">AI Remarks</h3>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                        {result.evaluation?.remarks}
                      </p>
                   </div>
                </div>

                {/* Extracted Text */}
                <div>
                   <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">Transcribed Text (OCR)</h3>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap font-mono relative">
                        {result.extractedText}
                      </p>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnswerChecker;
