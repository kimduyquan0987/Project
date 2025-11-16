
export interface PromptSettings {
    storyName: string;
    author: string;
    genre: string;
    sourceLanguage: string;
    prompt: string;
}

export interface DictionaryEntry {
    id: string;
    original: string;
    translation: string;
}

export interface ProcessingSettings {
    checkAndRedo: boolean;
    fixGrammar: boolean;
    warnMissingContent: boolean;
    missingContentThreshold: number;
    enableChunking: boolean;
    chunkSize: number;
}

export interface TranslationConfig {
    model: string;
    promptSettings: PromptSettings;
    dictionary: DictionaryEntry[];
    processingSettings: ProcessingSettings;
}

export interface TranslatedFile {
    name: string;
    content: string;
}

export interface TranslationProgress {
    currentFile: string;
    totalFiles: number;
    currentFileNumber: number;
    totalChunks: number;
    currentChunkNumber: number;
}

// Cấu trúc để lưu/tải cài đặt
export interface SettingsPreset {
    model: string;
    promptSettings: PromptSettings;
    dictionary: DictionaryEntry[];
    processingSettings: ProcessingSettings;
}

// Cấu trúc tệp nguồn có thể lưu trữ
export interface SourceFile {
    name: string;
    content: string;
}

// Cấu trúc để lưu phiên dịch vào localStorage
export interface TranslationSession {
    id: string;
    status: 'in-progress' | 'completed' | 'failed';
    sourceFiles: SourceFile[];
    settings: SettingsPreset; // Snapshot của cài đặt tại thời điểm dịch
    translatedFiles: TranslatedFile[];
    progress: {
        currentFileIndex: number;
        currentChunkIndex: number; // cho tệp hiện tại
    };
}

export interface ChapterInfo {
    number: number | null;
    name: string | null;
    status: 'ok' | 'warning';
    message?: string;
}

export interface AnalyzedFile {
    file: File;
    info: ChapterInfo;
}