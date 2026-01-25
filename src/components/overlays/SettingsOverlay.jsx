import React, { useState } from 'react';
import { X, Save, Key, Image as ImageIcon, Settings as SettingsIcon, ShieldCheck, Cloud, Zap } from 'lucide-react';
import useSettingsStore from '../../store/useSettingsStore';

const SettingsOverlay = ({ onClose }) => {
    const settings = useSettingsStore();

    const [form, setForm] = useState({
        syncId: settings.syncId,
        geminiApiKey: settings.geminiApiKey,
        pawanApiKey: settings.pawanApiKey,
        ocrSpaceApiKey: settings.ocrSpaceApiKey,
        freepikApiKey: settings.freepikApiKey,
        imageGenProvider: settings.imageGenProvider,
        // AI Provider
        preferredAiProvider: settings.preferredAiProvider,
        visionProvider: settings.visionProvider,
        // Context
        scannedContextLimit: settings.scannedContextLimit,
        textContextLimit: settings.textContextLimit,
        chapterContextLimit: settings.chapterContextLimit,
        manualChapterMode: settings.manualChapterMode
    });

    const handleSave = () => {
        settings.setSyncId(form.syncId);
        settings.setGeminiApiKey(form.geminiApiKey);
        settings.setPawanApiKey(form.pawanApiKey);
        settings.setOcrSpaceApiKey(form.ocrSpaceApiKey);
        settings.setFreepikApiKey(form.freepikApiKey);
        settings.setImageGenProvider(form.imageGenProvider);

        settings.setPreferredAiProvider(form.preferredAiProvider);
        settings.setVisionProvider(form.visionProvider);

        settings.setScannedContextLimit(form.scannedContextLimit);
        settings.setTextContextLimit(form.textContextLimit);
        settings.setChapterContextLimit(form.chapterContextLimit);
        if (settings.manualChapterMode !== form.manualChapterMode) settings.toggleManualChapterMode();

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <SettingsIcon size={24} />
                        <h2 className="text-xl font-bold">App Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20} /></button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Cloud Sync (No Login) */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl space-y-3 border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wide text-xs">
                            <span className="bg-indigo-600 text-white p-1 rounded-md shadow-sm"><Cloud size={14} /></span> Cloud Sync (No Login)
                        </div>
                        <p className="text-xs text-indigo-700/80 leading-relaxed">
                            Enter a unique <b>Sync Key</b> (e.g., your name + project) to sync data across devices without an account.
                            <span className="block mt-1 text-indigo-500 font-semibold opacity-75">Warning: Anyone with this key can view your data.</span>
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-3 top-2.5 text-indigo-400" size={16} />
                                <input
                                    type="text"
                                    value={form.syncId || ''}
                                    onChange={e => setForm({ ...form, syncId: e.target.value })}
                                    placeholder="Create a Sync Key..."
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border-2 border-indigo-100 focus:border-indigo-500 focus:ring-0 outline-none text-indigo-900 font-mono font-bold text-sm bg-white shadow-inner transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Feature Toggles</h3>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Enable AI Features</span>
                            <button onClick={settings.toggleAiFeatures} className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableAiFeatures ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableAiFeatures ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Enable Smart PDF Scanning (OCR)</span>
                            <button onClick={settings.togglePdfScanning} className={`w-12 h-6 rounded-full transition-colors relative ${settings.enablePdfScanning ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enablePdfScanning ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Enable Image Generation (Freepik)</span>
                            <button
                                onClick={() => setForm(f => ({ ...f, imageGenProvider: f.imageGenProvider === 'FREEPIK' ? 'NONE' : 'FREEPIK' }))}
                                className={`w-12 h-6 rounded-full transition-colors relative ${form.imageGenProvider === 'FREEPIK' ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.imageGenProvider === 'FREEPIK' ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* AI Provider Configuration */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl space-y-4 border border-purple-100 shadow-sm">
                        <div className="flex items-center gap-2 text-purple-700 font-bold uppercase tracking-wide text-xs">
                            <span className="bg-purple-600 text-white p-1 rounded-md shadow-sm"><Zap size={14} /></span> AI Provider Configuration
                        </div>

                        {/* Preferred AI Provider */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Preferred AI Provider</label>
                            <select
                                value={form.preferredAiProvider}
                                onChange={(e) => setForm({ ...form, preferredAiProvider: e.target.value })}
                                className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                            >
                                <option value="GEMINI">Gemini 2.5 Flash (Google)</option>
                                <option value="COSMOSRP_2_5">CosmosRP-2.5 (Pawan - Vision)</option>
                                <option value="COSMOSRP_2_1">CosmosRP-2.1 (Pawan - Vision)</option>
                                <option value="GPT_OSS">GPT-OSS 20B (Pawan)</option>
                            </select>
                            <p className="text-xs text-purple-600 mt-1">Primary AI model for generating activities</p>
                        </div>

                        {/* Vision Provider for Scanned PDFs */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Vision Model (Scanned PDFs)</label>
                            <select
                                value={form.visionProvider}
                                onChange={(e) => setForm({ ...form, visionProvider: e.target.value })}
                                className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                            >
                                <option value="AUTO">Auto (Try Gemini first)</option>
                                <option value="GEMINI">Gemini Only</option>
                                <option value="COSMOSRP">CosmosRP Only</option>
                            </select>
                            <p className="text-xs text-purple-600 mt-1">Analyzes scanned PDF pages as images</p>
                        </div>

                        {/* Auto-Fallback Toggle */}
                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <span className="font-semibold text-gray-700 text-sm">Auto-Fallback</span>
                                <p className="text-xs text-gray-500 mt-0.5">Switch to backup models if primary fails</p>
                            </div>
                            <button
                                onClick={settings.toggleAutoFallback}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableAutoFallback ? 'bg-purple-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableAutoFallback ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Context & Network Strategy */}
                    <div className="bg-orange-50 p-4 rounded-xl space-y-4 border border-orange-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2">
                                <ShieldCheck size={16} /> Context Strategy
                            </h3>
                            <div className="flex flex-col items-end gap-3 md:gap-2">
                                {/* Toggle: Manual Chapter Mode */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-600">Manual Chapter Mode</span>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, manualChapterMode: !f.manualChapterMode }))}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${form.manualChapterMode ? 'bg-orange-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.manualChapterMode ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                                {/* Toggle: Periodic Checkpoints */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-600">Auto-Checkpoints (5pg)</span>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, enablePeriodicCheckpoints: !f.enablePeriodicCheckpoints }))}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${form.enablePeriodicCheckpoints ? 'bg-orange-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enablePeriodicCheckpoints ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-4 md:space-y-3">
                            <div className="py-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                                    <span>Scanned PDF Checkpoint (Pages: {form.scannedContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    value={form.scannedContextLimit}
                                    onChange={(e) => setForm({ ...form, scannedContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>

                            <div className="py-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                                    <span>Text PDF Checkpoint (Pages: {form.textContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="1" max="15" step="1"
                                    value={form.textContextLimit}
                                    onChange={(e) => setForm({ ...form, textContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>

                            <div className="py-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                                    <span>Chapter End Analysis (Pages: {form.chapterContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="5" max="30" step="1"
                                    value={form.chapterContextLimit}
                                    onChange={(e) => setForm({ ...form, chapterContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                            <Key size={16} /> API Keys
                        </h3>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Gemini API Key</label>
                            <input
                                type="password"
                                value={form.geminiApiKey}
                                onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                                placeholder="Enter Gemini API Key..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Pawan API Key <span className="text-purple-500">(Optional - Free tier available)</span></label>
                            <input
                                type="password"
                                value={form.pawanApiKey}
                                onChange={(e) => setForm({ ...form, pawanApiKey: e.target.value })}
                                placeholder="Enter Pawan API Key..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">OCR.space API Key</label>
                            <input
                                type="password"
                                value={form.ocrSpaceApiKey}
                                onChange={(e) => setForm({ ...form, ocrSpaceApiKey: e.target.value })}
                                placeholder="Enter OCR.space Key..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600">Freepik API Key</label>
                            <input
                                type="password"
                                value={form.freepikApiKey}
                                onChange={(e) => setForm({ ...form, freepikApiKey: e.target.value })}
                                placeholder="Enter Freepik API Key..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 shrink-0 flex justify-end gap-2 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsOverlay;
