import React from 'react';
import { Card } from './Card';
import { DownloadIcon } from './icons';
import type { TranslatedFile, TranslationProgress } from '../types';

interface DownloadManagerProps {
    onTranslate: () => void;
    translatedFiles: TranslatedFile[];
    isLoading: boolean;
    hasFiles: boolean;
    translationProgress: TranslationProgress | null;
    isResuming?: boolean;
    eta: string | null;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({ onTranslate, translatedFiles, isLoading, hasFiles, translationProgress, isResuming = false, eta }) => {
    
    const handleDownload = (file: TranslatedFile) => {
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleDownloadAll = () => {
        // In a real app, this would zip the files. For now, we download them sequentially.
        translatedFiles.forEach((file, i) => {
            setTimeout(() => handleDownload(file), i * 300);
        });
    };

    const buttonText = isLoading ? (isResuming ? 'Đang tiếp tục...' : 'Đang dịch...') : (isResuming ? 'Tiếp Tục Dịch' : 'Bắt đầu Dịch');

    return (
        <Card title="Xử Lý & Tải Xuống" step={6}>
            <div className="flex flex-col h-full space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={onTranslate}
                        disabled={isLoading || !hasFiles}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                         {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : null}
                        {buttonText}
                    </button>
                    <button 
                        onClick={handleDownloadAll}
                        disabled={isLoading || translatedFiles.length === 0}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Tải Tất Cả
                    </button>
                </div>
                <div className="flex-grow bg-slate-900/50 rounded-lg p-2 min-h-[100px] flex flex-col justify-center">
                    {isLoading ? (
                        translationProgress ? (
                            <div className="text-center text-slate-400 p-4 w-full">
                                <p className="font-semibold text-lg text-white">Đang xử lý...</p>
                                <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4 mb-2">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(translationProgress.currentFileNumber - 1 + (translationProgress.currentChunkNumber / (translationProgress.totalChunks || 1))) / translationProgress.totalFiles * 100}%` }}></div>
                                </div>
                                <p className="text-sm truncate" title={translationProgress.currentFile}>
                                    Tệp {translationProgress.currentFileNumber}/{translationProgress.totalFiles}: {translationProgress.currentFile}
                                </p>
                                {translationProgress.totalChunks > 1 && (
                                     <p className="text-sm mt-1 text-slate-500">
                                        Đoạn {translationProgress.currentChunkNumber} / {translationProgress.totalChunks}
                                     </p>
                                )}
                                {eta && (
                                    <p className="text-xs mt-2 text-slate-500">
                                        Thời gian hoàn thành dự kiến: <span className="font-semibold text-slate-400">{eta}</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="m-auto text-slate-400">Đang khởi tạo...</div>
                        )
                    ) : translatedFiles.length > 0 ? (
                        <div className="overflow-y-auto space-y-2 pr-2 h-full max-h-48 py-2">
                           {translatedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-slate-700/70 p-2 rounded-md">
                                    <span className="text-sm font-medium text-slate-200 truncate pr-4">{file.name}</span>
                                    <button onClick={() => handleDownload(file)} className="text-sm text-blue-400 hover:text-blue-300 font-semibold flex-shrink-0">
                                        Tải xuống
                                    </button>
                                </div>
                           ))}
                        </div>
                    ) : (
                         <div className="text-center text-slate-500">
                           <p>{hasFiles ? (isResuming ? 'Sẵn sàng để tiếp tục phiên dịch.' : 'Nhấn "Bắt đầu Dịch" để xử lý.') : 'Chưa có tệp nào được chọn.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};