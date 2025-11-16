import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { ModelSelector } from './components/ModelSelector';
import { PromptEditor } from './components/PromptEditor';
import { CustomDictionary } from './components/CustomDictionary';
import { ProcessingOptions } from './components/ProcessingOptions';
import { DownloadManager } from './components/DownloadManager';
import { translateText } from './services/geminiService';
import type { DictionaryEntry, PromptSettings, ProcessingSettings, TranslatedFile, TranslationProgress, SettingsPreset, TranslationSession, SourceFile, AnalyzedFile } from './types';
import { DEFAULT_PROMPT } from './constants';

const App: React.FC = () => {
    const [analyzedFiles, setAnalyzedFiles] = useState<AnalyzedFile[]>([]);
    const [model, setModel] = useState<string>('gemini-2.5-flash');
    const [promptSettings, setPromptSettings] = useState<PromptSettings>({
        storyName: '', author: '', genre: '', sourceLanguage: '', prompt: DEFAULT_PROMPT,
    });
    const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
    const [processingSettings, setProcessingSettings] = useState<ProcessingSettings>({
        checkAndRedo: true, fixGrammar: true, warnMissingContent: true, missingContentThreshold: 30, enableChunking: false, chunkSize: 5000,
    });
    const [translatedFiles, setTranslatedFiles] = useState<TranslatedFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [translationProgress, setTranslationProgress] = useState<TranslationProgress | null>(null);
    const [session, setSession] = useState<TranslationSession | null>(null);
    const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
    const [eta, setEta] = useState<string | null>(null);
    const settingsInputRef = useRef<HTMLInputElement>(null);
    const sessionInputRef = useRef<HTMLInputElement>(null);
    const timingRef = useRef<{
        startTime: number;
        totalChunks: number;
        initialProcessedChunks: number;
    }>({ startTime: 0, totalChunks: 0, initialProcessedChunks: 0 });

    useEffect(() => {
        try {
            const savedSessionRaw = localStorage.getItem('translationSession');
            if (savedSessionRaw) {
                const savedSession = JSON.parse(savedSessionRaw) as TranslationSession;
                if (savedSession.status === 'in-progress' || savedSession.status === 'failed') {
                    setSession(savedSession);
                    setShowResumePrompt(true);
                }
            }
        } catch (e) {
            console.error("Failed to parse saved session", e);
            localStorage.removeItem('translationSession');
        }
    }, []);

    const handleSaveSettings = () => {
        const settings: SettingsPreset = { model, promptSettings, dictionary, processingSettings };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'translation_settings.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleLoadSettingsClick = () => {
        settingsInputRef.current?.click();
    };

    const handleSettingsFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const settings = JSON.parse(content) as SettingsPreset;
                setModel(settings.model || 'gemini-2.5-flash');
                setPromptSettings(settings.promptSettings || { storyName: '', author: '', genre: '', sourceLanguage: '', prompt: DEFAULT_PROMPT });
                setDictionary(settings.dictionary || []);
                setProcessingSettings(settings.processingSettings || { checkAndRedo: true, fixGrammar: true, warnMissingContent: true, missingContentThreshold: 30, enableChunking: false, chunkSize: 5000 });
            } catch (err) {
                setError("Tệp cài đặt không hợp lệ.");
            }
        };
        reader.readAsText(file);
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleSaveSession = () => {
        if (!session) {
            setError("Không có phiên dịch nào đang hoạt động để lưu.");
            setTimeout(() => setError(null), 3000);
            return;
        }
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translation_session_${session.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleLoadSessionClick = () => {
        sessionInputRef.current?.click();
    };

    const handleSessionFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const loadedSession = JSON.parse(content) as TranslationSession;

                if (!loadedSession.id || !loadedSession.status || !loadedSession.sourceFiles || !loadedSession.settings) {
                    throw new Error("Invalid session file format.");
                }

                setSession(loadedSession);
                setModel(loadedSession.settings.model);
                setPromptSettings(loadedSession.settings.promptSettings);
                setDictionary(loadedSession.settings.dictionary);
                setProcessingSettings(loadedSession.settings.processingSettings);
                setTranslatedFiles(loadedSession.translatedFiles || []);
                setAnalyzedFiles([]);
                setShowResumePrompt(false);
                setError(null);
                setWarning(null);

            } catch (err) {
                setError("Tệp phiên dịch không hợp lệ hoặc bị hỏng.");
            }
        };
        reader.readAsText(file);
        if (e.target) {
            e.target.value = '';
        }
    };


    const handleTranslate = useCallback(async (isResuming = false) => {
        let sessionToProcess: TranslationSession;
        let startingFileIndex = 0;
        let startingChunkIndex = 0;
        let initialTranslatedFiles: TranslatedFile[] = [];

        if (isResuming && session) {
            sessionToProcess = { ...session, status: 'in-progress' };
            startingFileIndex = session.progress.currentFileIndex;
            startingChunkIndex = session.progress.currentChunkIndex;
            initialTranslatedFiles = session.translatedFiles;
        } else {
            if (analyzedFiles.length === 0) {
                setError("Vui lòng tải lên ít nhất một tệp để dịch.");
                return;
            }
            setIsLoading(true);
            setError(null);
            setWarning(null);
            setTranslatedFiles([]);
            setTranslationProgress({ currentFile: "Đang chuẩn bị...", totalFiles: analyzedFiles.length, currentFileNumber: 0, totalChunks: 0, currentChunkNumber: 0 });

            const sourceFiles: SourceFile[] = await Promise.all(
                analyzedFiles.map(async (af) => ({ name: af.file.name, content: await af.file.text() }))
            );
            
            const newSession: TranslationSession = {
                id: Date.now().toString(),
                status: 'in-progress',
                sourceFiles,
                settings: { model, promptSettings, dictionary, processingSettings },
                translatedFiles: [],
                progress: { currentFileIndex: 0, currentChunkIndex: 0 }
            };
            sessionToProcess = newSession;
        }

        setSession(sessionToProcess);
        setIsLoading(true);
        setError(null);
        setWarning(null);
        setTranslatedFiles(initialTranslatedFiles);
        setEta(null);

        localStorage.setItem('translationSession', JSON.stringify(sessionToProcess));

        // --- ETA Calculation Setup ---
        let totalChunksToProcess = 0;
        let initialProcessedChunks = 0;
        const filesToProcess = sessionToProcess.sourceFiles;
        const settingsForChunking = sessionToProcess.settings.processingSettings;

        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            const content = file.content;
            const isChunkingEnabled = settingsForChunking.enableChunking && content.length > settingsForChunking.chunkSize;
            const numChunks = isChunkingEnabled ? Math.ceil(content.length / settingsForChunking.chunkSize) : 1;
            totalChunksToProcess += numChunks;
            if (isResuming && i < startingFileIndex) {
                initialProcessedChunks += numChunks;
            }
        }
        if (isResuming) {
            initialProcessedChunks += startingChunkIndex;
        }

        timingRef.current = {
            startTime: Date.now(),
            totalChunks: totalChunksToProcess,
            initialProcessedChunks: initialProcessedChunks,
        };

        let processedChunksCount = initialProcessedChunks;

        const updateEta = () => {
            const { startTime, totalChunks, initialProcessedChunks } = timingRef.current;
            const chunksDoneInSession = processedChunksCount - initialProcessedChunks;
            if (chunksDoneInSession <= 0) {
                setEta(null);
                return;
            }
            
            const elapsedTimeMs = Date.now() - startTime;
            const timePerChunk = elapsedTimeMs / chunksDoneInSession;
            const remainingChunks = totalChunks - processedChunksCount;
            const etaMs = remainingChunks * timePerChunk;
            
            if (isFinite(etaMs) && etaMs > 1000) {
                const totalSeconds = Math.round(etaMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
        
                let etaString = '';
                if (hours > 0) etaString += `${hours} giờ `;
                if (minutes > 0) etaString += `${minutes} phút `;
                if (seconds > 0 || (hours === 0 && minutes === 0)) etaString += `${seconds} giây`;
                
                setEta(`~ ${etaString.trim()}`);
            } else {
                setEta(null);
            }
        };
        // --- End ETA Calculation Setup ---

        const warnings: string[] = [];
        let newTranslatedFiles: TranslatedFile[] = [...initialTranslatedFiles];

        for (let fileIndex = startingFileIndex; fileIndex < sessionToProcess.sourceFiles.length; fileIndex++) {
            const file = sessionToProcess.sourceFiles[fileIndex];
            try {
                const content = file.content;
                let translatedContent = '';
                const translationConfig = sessionToProcess.settings;

                if (translationConfig.processingSettings.enableChunking && content.length > translationConfig.processingSettings.chunkSize) {
                    const chunks: string[] = [];
                    for (let i = 0; i < content.length; i += translationConfig.processingSettings.chunkSize) {
                        chunks.push(content.substring(i, i + translationConfig.processingSettings.chunkSize));
                    }
                    
                    let translatedChunks: string[] = [];
                    const existingFile = newTranslatedFiles.find(f => f.name === file.name);
                    if(existingFile) {
                        newTranslatedFiles = newTranslatedFiles.filter(f => f.name !== file.name);
                        // Don't reset startingChunkIndex if we're resuming this specific file.
                        if(!isResuming || fileIndex !== startingFileIndex) {
                            startingChunkIndex = 0;
                        }
                    }

                    for (let chunkIndex = startingChunkIndex; chunkIndex < chunks.length; chunkIndex++) {
                        const chunk = chunks[chunkIndex];
                        setTranslationProgress({
                            currentFile: file.name, totalFiles: sessionToProcess.sourceFiles.length, currentFileNumber: fileIndex + 1,
                            totalChunks: chunks.length, currentChunkNumber: chunkIndex + 1,
                        });
                        const translatedChunk = await translateText(chunk, translationConfig);
                        translatedChunks.push(translatedChunk);
                        
                        processedChunksCount++;
                        updateEta();

                        sessionToProcess = { ...sessionToProcess, progress: { currentFileIndex: fileIndex, currentChunkIndex: chunkIndex + 1 }};
                        setSession(sessionToProcess);
                        localStorage.setItem('translationSession', JSON.stringify(sessionToProcess));
                    }
                    translatedContent = translatedChunks.join('');
                } else {
                    setTranslationProgress({
                        currentFile: file.name, totalFiles: sessionToProcess.sourceFiles.length, currentFileNumber: fileIndex + 1,
                        totalChunks: 1, currentChunkNumber: 1,
                    });
                    translatedContent = await translateText(content, translationConfig);
                    processedChunksCount++;
                    updateEta();
                }

                if (translationConfig.processingSettings.warnMissingContent) {
                    const originalLength = content.length;
                    const translatedLength = translatedContent.length;
                    const threshold = (100 - translationConfig.processingSettings.missingContentThreshold) / 100;
                    if (translatedLength < originalLength * threshold) {
                         warnings.push(file.name);
                    }
                }
                
                const finalFile = { name: file.name, content: translatedContent };
                const existingIndex = newTranslatedFiles.findIndex(f => f.name === file.name);
                if (existingIndex > -1) {
                    newTranslatedFiles[existingIndex] = finalFile;
                } else {
                    newTranslatedFiles.push(finalFile);
                }
                
                setTranslatedFiles([...newTranslatedFiles]);
                sessionToProcess = { ...sessionToProcess, translatedFiles: newTranslatedFiles, progress: { currentFileIndex: fileIndex + 1, currentChunkIndex: 0 }};
                setSession(sessionToProcess);
                localStorage.setItem('translationSession', JSON.stringify(sessionToProcess));
                startingChunkIndex = 0;

            } catch (err) {
                console.error(`Error translating file ${file.name}:`, err);
                const errorMessage = err instanceof Error ? err.message : `Lỗi khi dịch tệp ${file.name}.`;
                setError(`${errorMessage} Bạn có thể thử lại.`);
                sessionToProcess = {...sessionToProcess, status: 'failed' };
                setSession(sessionToProcess);
                localStorage.setItem('translationSession', JSON.stringify(sessionToProcess));
                setIsLoading(false);
                setTranslationProgress(null);
                setEta(null);
                return;
            }
        }
        
        if (warnings.length > 0) {
            setWarning(`Cảnh báo thiếu nội dung có thể xảy ra ở ${warnings.length} tệp (ví dụ: ${warnings[0]}).`);
        }
        
        setTranslatedFiles(newTranslatedFiles);
        setIsLoading(false);
        setTranslationProgress(null);
        setEta(null);
        localStorage.removeItem('translationSession');
        setSession(null);
    }, [analyzedFiles, model, promptSettings, dictionary, processingSettings, session]);

    const handleResume = () => {
        if (!session) return;
        setShowResumePrompt(false);
        setModel(session.settings.model);
        setPromptSettings(session.settings.promptSettings);
        setDictionary(session.settings.dictionary);
        setProcessingSettings(session.settings.processingSettings);
        setAnalyzedFiles([]); // Clear file input as we use session files
        handleTranslate(true);
    };

    const handleDiscardSession = () => {
        setShowResumePrompt(false);
        setSession(null);
        localStorage.removeItem('translationSession');
    };

    const isResumable = session?.status === 'in-progress' || session?.status === 'failed';

    return (
        <div className="min-h-screen bg-slate-900 text-gray-300 font-sans p-4 sm:p-6 lg:p-8">
            <input type="file" ref={settingsInputRef} onChange={handleSettingsFileSelected} className="hidden" accept=".json" />
            <input type="file" ref={sessionInputRef} onChange={handleSessionFileSelected} className="hidden" accept=".json" />
            <div className="max-w-7xl mx-auto">
                <Header 
                    onSaveSettings={handleSaveSettings} 
                    onLoadSettings={handleLoadSettingsClick}
                    onSaveSession={handleSaveSession}
                    onLoadSession={handleLoadSessionClick}
                    isSessionActive={!!session}
                    isLoading={isLoading}
                />
                <main className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 flex flex-col gap-8">
                        <FileUpload analyzedFiles={analyzedFiles} setAnalyzedFiles={setAnalyzedFiles} setError={setError} />
                        <ModelSelector model={model} setModel={setModel} />
                        <PromptEditor settings={promptSettings} setSettings={setPromptSettings} />
                    </div>
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <CustomDictionary dictionary={dictionary} setDictionary={setDictionary} />
                        <ProcessingOptions settings={processingSettings} setSettings={setProcessingSettings} />
                        <DownloadManager 
                            onTranslate={() => handleTranslate(isResumable)} 
                            translatedFiles={translatedFiles}
                            isLoading={isLoading}
                            hasFiles={analyzedFiles.length > 0 || isResumable}
                            translationProgress={translationProgress}
                            isResuming={isResumable}
                            eta={eta}
                        />
                    </div>
                </main>
            </div>
            <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-50">
                {showResumePrompt && (
                     <div className="bg-blue-600 text-white py-3 px-5 rounded-lg shadow-lg max-w-sm">
                        <p className="font-bold">Tìm thấy phiên chưa hoàn tất</p>
                        <p className="text-sm mt-1">Bạn có muốn tiếp tục dịch từ nơi bạn đã dừng lại không?</p>
                        <div className="flex gap-3 mt-3">
                            <button onClick={handleResume} className="bg-white text-blue-600 font-bold py-1 px-3 rounded text-sm hover:bg-blue-100">Tiếp tục</button>
                            <button onClick={handleDiscardSession} className="bg-blue-500 hover:bg-blue-400 font-bold py-1 px-3 rounded text-sm">Hủy bỏ</button>
                        </div>
                    </div>
                )}
                {warning && (
                    <div className="bg-yellow-500 text-slate-900 py-2 px-4 rounded-lg shadow-lg max-w-sm">
                        <p className="font-bold">Cảnh báo</p>
                        <p>{warning}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-red-600 text-white py-2 px-4 rounded-lg shadow-lg max-w-sm">
                         <p className="font-bold">Lỗi</p>
                         <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;