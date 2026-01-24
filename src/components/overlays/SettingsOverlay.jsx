import React, { useState } from 'react';
import { X, Save, Key, Image as ImageIcon, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import useSettingsStore from '../../store/useSettingsStore';

const SettingsOverlay = ({ onClose }) => {
    const settings = useSettingsStore();

    const [form, setForm] = useState({
        geminiApiKey: settings.geminiApiKey,
        ocrSpaceApiKey: settings.ocrSpaceApiKey,
        freepikApiKey: settings.freepikApiKey,
        imageGenProvider: settings.imageGenProvider,
        // Context
        scannedContextLimit: settings.scannedContextLimit,
        textContextLimit: settings.textContextLimit,
        chapterContextLimit: settings.chapterContextLimit,
        manualChapterMode: settings.manualChapterMode
    });

    const handleSave = () => {
        settings.setGeminiApiKey(form.geminiApiKey);
        settings.setOcrSpaceApiKey(form.ocrSpaceApiKey);
        settings.setFreepikApiKey(form.freepikApiKey);
        settings.setImageGenProvider(form.imageGenProvider);

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

                    {/* Context & Network Strategy */}
                    <div className="bg-orange-50 p-4 rounded-xl space-y-4 border border-orange-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2">
                                <ShieldCheck size={16} /> Context Strategy
                            </h3>
                            <div className="flex flex-col items-end gap-2">
                                {/* Toggle: Manual Chapter Mode */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-600">Manual Chapter Mode</span>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, manualChapterMode: !f.manualChapterMode }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${form.manualChapterMode ? 'bg-orange-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.manualChapterMode ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                                {/* Toggle: Periodic Checkpoints */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-600">Auto-Checkpoints (5pg)</span>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, enablePeriodicCheckpoints: !f.enablePeriodicCheckpoints }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${form.enablePeriodicCheckpoints ? 'bg-orange-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.enablePeriodicCheckpoints ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                                    <span>Scanned PDF Checkpoint (Pages: {form.scannedContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    value={form.scannedContextLimit}
                                    onChange={(e) => setForm({ ...form, scannedContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                                    <span>Text PDF Checkpoint (Pages: {form.textContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="1" max="15" step="1"
                                    value={form.textContextLimit}
                                    onChange={(e) => setForm({ ...form, textContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                                    <span>Chapter End Analysis (Pages: {form.chapterContextLimit})</span>
                                </div>
                                <input
                                    type="range" min="5" max="30" step="1"
                                    value={form.chapterContextLimit}
                                    onChange={(e) => setForm({ ...form, chapterContextLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
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
