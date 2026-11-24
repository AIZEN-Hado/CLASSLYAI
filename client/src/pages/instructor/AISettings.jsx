import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaSave, FaTrash, FaRobot, FaKey, FaCheckCircle, FaSpinner, FaFlask } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const PROVIDERS = {
    openai: {
        label: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        placeholder: 'sk-...',
        helpUrl: 'https://platform.openai.com/api-keys'
    },
    gemini: {
        label: 'Google Gemini',
        models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash', 'gemini-2.0-flash'],
        placeholder: 'AIza...',
        helpUrl: 'https://aistudio.google.com/apikey'
    },
    anthropic: {
        label: 'Anthropic',
        models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250514'],
        placeholder: 'sk-ant-...',
        helpUrl: 'https://console.anthropic.com/settings/keys'
    }
};

const AISettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);

    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-4o');
    const [maskedKey, setMaskedKey] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/ai/config');
            if (res.data) {
                setProvider(res.data.provider);
                setModel(res.data.model);
                setMaskedKey(res.data.apiKeyMasked);
                setHasExisting(true);
            }
        } catch (err) {
            // No config yet — that's fine
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        setModel(PROVIDERS[newProvider].models[0]);
        setApiKey('');
        setMaskedKey('');
    };

    const handleSave = async () => {
        if (!apiKey && !hasExisting) {
            showError('Please enter your API key');
            return;
        }
        if (!apiKey && hasExisting) {
            // Only updating provider/model without changing key — not supported, need key
            showError('Please enter your API key to save');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post('/ai/config', { provider, apiKey, model });
            setMaskedKey(res.data.apiKeyMasked);
            setApiKey('');
            setHasExisting(true);
            showSuccess('AI configuration saved');
        } catch (err) {
            showError(err, 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!apiKey) {
            showError('Enter your API key first to test');
            return;
        }
        setTesting(true);
        try {
            const res = await api.post('/ai/test', { provider, apiKey, model });
            if (res.data.success) {
                showSuccess('Connection successful');
            } else {
                showError('Test returned unexpected response');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Connection test failed';
            if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                showError('API key is valid but your free quota is exhausted. Enable billing or wait and retry.');
            } else {
                showError(msg);
            }
        } finally {
            setTesting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Remove your AI configuration? You can add it again later.')) return;
        try {
            await api.delete('/ai/config');
            setHasExisting(false);
            setApiKey('');
            setMaskedKey('');
            setProvider('openai');
            setModel('gpt-4o');
            showSuccess('AI configuration removed');
        } catch (err) {
            showError('Failed to delete configuration');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-zinc-500">Loading AI settings...</div>
            </div>
        );
    }

    const currentProvider = PROVIDERS[provider];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white pb-12">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-navbar z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <FaArrowLeft /> <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        <FaRobot className="text-zinc-400" /> AI Settings
                    </h1>
                    <div className="w-20" />
                </div>
            </div>

            <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
                {/* Status Banner */}
                {hasExisting && (
                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-5 py-4">
                        <FaCheckCircle className="text-green-500 text-lg shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-green-800 dark:text-green-300">AI Connected</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                {currentProvider.label} &middot; {model} &middot; Key: {maskedKey}
                            </p>
                        </div>
                    </div>
                )}

                {/* Provider Selection */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                        <h2 className="text-sm font-semibold text-zinc-500">AI Provider</h2>
                        <p className="text-xs text-zinc-400 mt-1">Choose your AI provider and enter your API key</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Provider Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(PROVIDERS).map(([key, p]) => (
                                <button
                                    key={key}
                                    onClick={() => handleProviderChange(key)}
                                    className={`p-4 rounded-xl border-2 text-center transition ${
                                        provider === key
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                                >
                                    <span className={`text-sm font-semibold ${provider === key ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400">Model</label>
                            <select
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            >
                                {currentProvider.models.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                                <FaKey className="text-xs" /> API Key
                            </label>
                            <input
                                type="password"
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={hasExisting ? `Current: ${maskedKey} (enter new key to change)` : currentProvider.placeholder}
                            />
                            <p className="text-[11px] text-zinc-400">
                                Get your key from{' '}
                                <a href={currentProvider.helpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    {currentProvider.label} Dashboard
                                </a>
                                . Your key is encrypted and never shown again.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                onClick={handleTest}
                                disabled={!apiKey || testing}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {testing ? <FaSpinner className="animate-spin" /> : <FaFlask />}
                                {testing ? 'Testing...' : 'Test connection'}
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={!apiKey || saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                {saving ? 'Saving...' : 'Save configuration'}
                            </button>

                            {hasExisting && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                                >
                                    <FaTrash /> Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">How it works</h3>
                    <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5 font-semibold">1.</span>
                            Enter your API key from any supported provider
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5 font-semibold">2.</span>
                            Your key is encrypted with AES-256 and stored securely
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5 font-semibold">3.</span>
                            Use "Generate with AI" in Quiz Manager to auto-create questions
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5 font-semibold">4.</span>
                            Generate study notes for any topic in your courses
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5 font-semibold">5.</span>
                            API calls are made using YOUR key — you control the cost
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
