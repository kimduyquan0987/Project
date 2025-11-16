import React, { useCallback, useState } from 'react';
import { Card } from './Card';
import { UploadIcon, WarningIcon, ChevronDownIcon } from './icons';
import type { Dispatch, SetStateAction } from 'react';
import type { AnalyzedFile } from '../types';
import { analyzeFiles } from '../services/fileAnalyzer';

interface FileUploadProps {
    analyzedFiles: AnalyzedFile[];
    setAnalyzedFiles: Dispatch<SetStateAction<AnalyzedFile[]>>;
    setError: Dispatch<SetStateAction<string | null>>;
}

const ITEMS_PER_PAGE = 5;

const ModeButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; disabled?: boolean; tooltip?: string }> = ({ label, isActive, onClick, disabled = false, tooltip }) => (
    <button
        onClick={!disabled ? onClick : () => {}}
        disabled={disabled}
        title={tooltip}
        className={`w-full text-center text-sm font-semibold py-1.5 px-2 rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
            isActive
                ? 'bg-blue-600 text-white shadow'
                : 'bg-transparent text-slate-300 hover:bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {label}
        {disabled && <span className="text-xs"> (sắp có)</span>}
    </button>
);


export const FileUpload: React.FC<FileUploadProps> = ({ analyzedFiles, setAnalyzedFiles, setError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('multiple');
    const [currentPage, setCurrentPage] = useState(1);

    const handleFileSelection = useCallback(async (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) return;
        
        if (uploadMode === 'single' && selectedFiles.length > 1) {
            setError("Chế độ 'Một tệp' chỉ cho phép tải lên một tệp duy nhất. Vui lòng thử lại.");
            setTimeout(() => setError(null), 5000);
            return;
        }

        const txtFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.txt'));
        const unsupportedFiles = selectedFiles.filter(f => !f.name.toLowerCase().endsWith('.txt'));
        
        if (unsupportedFiles.length > 0) {
            const unsupportedNames = unsupportedFiles.map(f => f.name).slice(0,3).join(', ');
            const message = `Định dạng tệp không được hỗ trợ (${unsupportedNames}${unsupportedFiles.length > 3 ? '...' : ''}). Vui lòng chỉ tải lên tệp .txt.`;
            setError(message);
            setTimeout(() => setError(null), 5000);
        }

        if (txtFiles.length === 0) return;
        
        setCurrentPage(1); // Quay về trang đầu tiên khi có tệp mới
        setIsAnalyzing(true);
        setAnalyzedFiles([]); // Xóa kết quả cũ
        try {
            const analyzed = await analyzeFiles(txtFiles, uploadMode);
            setAnalyzedFiles(analyzed);
            setIsDetailsExpanded(true);
        } catch (error) {
            console.error("Lỗi khi phân tích tệp:", error);
            const message = error instanceof Error ? error.message : "Lỗi không xác định khi phân tích tệp.";
            setError(message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsAnalyzing(false);
        }
    }, [setAnalyzedFiles, setError, uploadMode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFileSelection(Array.from(e.target.files));
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAnalyzing) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (!isAnalyzing && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(Array.from(e.dataTransfer.files));
        }
    };

    const handleModeChange = (mode: 'single' | 'multiple') => {
        setUploadMode(mode);
        if (analyzedFiles.length > 0) {
            setAnalyzedFiles([]);
        }
        setCurrentPage(1); // Quay về trang đầu tiên khi thay đổi chế độ
    };
    
    const identifiedChaptersCount = analyzedFiles.filter(f => f.info.number !== null).length;
    const unidentifiedFilesCount = analyzedFiles.length - identifiedChaptersCount;
    
    // Logic phân trang
    const totalPages = Math.ceil(analyzedFiles.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedFiles = analyzedFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <Card title="Tải Lên & Kiểm Tra Tệp Tin" step={1}>
            <div className="flex flex-col h-full">
                <div className="mb-4">
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Chế độ tải lên:</label>
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-700 p-1">
                        <ModeButton
                            label="Nhiều tệp"
                            isActive={uploadMode === 'multiple'}
                            onClick={() => handleModeChange('multiple')}
                        />
                        <ModeButton
                            label="Một tệp"
                            isActive={uploadMode === 'single'}
                            onClick={() => handleModeChange('single')}
                        />
                        <ModeButton
                            label="Tệp nén"
                            isActive={false}
                            onClick={() => {}}
                            disabled={true}
                            tooltip="Tính năng xử lý tệp nén (.zip/.rar) sắp ra mắt"
                        />
                    </div>
                </div>
                <label 
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg transition-colors ${isAnalyzing ? 'cursor-wait bg-slate-700/50 border-slate-600' : isDragging ? 'border-blue-500 bg-slate-700/50 cursor-copy' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30 cursor-pointer'}`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                         {isAnalyzing ? (
                            <>
                                <svg className="animate-spin h-10 w-10 text-slate-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mb-2 text-sm text-slate-300">Đang phân tích tệp...</p>
                                <p className="text-xs text-slate-500">Quá trình này có thể mất một lúc với tệp lớn.</p>
                            </>
                        ) : (
                            <>
                                <UploadIcon className="w-10 h-10 text-slate-400 mb-3" />
                                <p className="mb-2 text-sm text-slate-400">
                                    <span className="font-semibold text-blue-400">Kéo thả</span> hoặc <span className="font-semibold text-blue-400">nhấp để chọn</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                     {uploadMode === 'single' ? 'Hỗ trợ một tệp .txt chứa nhiều chương' : 'Hỗ trợ nhiều tệp .txt'}
                                </p>
                            </>
                        )}
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" multiple={uploadMode === 'multiple'} accept=".txt" onChange={handleFileChange} disabled={isAnalyzing} />
                </label>
                {(analyzedFiles.length > 0 || isAnalyzing) && (
                    <div className="mt-4 text-sm text-slate-300 flex flex-col flex-grow overflow-hidden">
                        <div className="flex justify-between items-center mb-2 flex-shrink-0">
                             <div>
                                <p className="font-semibold">Kết quả phân tích:</p>
                                {!isAnalyzing && (
                                    <p className="text-xs text-slate-400">
                                        <span className="font-bold text-green-400">{identifiedChaptersCount} chương</span>
                                        {unidentifiedFilesCount > 0 && (
                                            <>
                                                , <span className="font-bold text-yellow-400">{unidentifiedFilesCount} tệp</span> không rõ
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} 
                                className="text-slate-400 hover:text-white p-1 rounded-full"
                                aria-label={isDetailsExpanded ? "Ẩn chi tiết" : "Hiện chi tiết"}
                                disabled={isAnalyzing}
                            >
                                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isDetailsExpanded ? 'rotate-180' : 'rotate-0'}`} />
                            </button>
                        </div>
                        
                        {isDetailsExpanded && !isAnalyzing && (
                            <div className="flex-grow flex flex-col min-h-0">
                                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                                    {paginatedFiles.map(({ file, info }, index) => (
                                        <div key={index} className={`p-2 rounded-md border ${info.status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium truncate" title={file.name}>{file.name}</p>
                                                {info.status === 'warning' && <WarningIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-2" />}
                                            </div>
                                            {info.number !== null ? (
                                                <p className="text-xs text-slate-400 mt-1">
                                                    <span className="font-semibold text-blue-400">Chương {info.number}:</span> {info.name || <span className="italic">Không có tên</span>}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500 mt-1 italic">{info.message}</p>
                                            )}
                                            {info.message && info.number !== null && (
                                                <p className="text-xs text-yellow-400 mt-1">{info.message}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex-shrink-0 flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 text-sm bg-slate-700 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Trước
                                        </button>
                                        <span className="text-sm text-slate-400">
                                            Trang {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 text-sm bg-slate-700 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};