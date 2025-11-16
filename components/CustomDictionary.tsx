import React, { useState, useRef } from 'react';
import { Card } from './Card';
import { TrashIcon, PlusIcon, UploadIcon, DownloadIcon } from './icons';
import type { DictionaryEntry } from '../types';
import type { Dispatch, SetStateAction } from 'react';

interface CustomDictionaryProps {
    dictionary: DictionaryEntry[];
    setDictionary: Dispatch<SetStateAction<DictionaryEntry[]>>;
}

export const CustomDictionary: React.FC<CustomDictionaryProps> = ({ dictionary, setDictionary }) => {
    const [original, setOriginal] = useState('');
    const [translation, setTranslation] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = () => {
        if (original.trim() && translation.trim()) {
            setDictionary(prev => [...prev, { id: Date.now().toString(), original: original.trim(), translation: translation.trim() }]);
            setOriginal('');
            setTranslation('');
        }
    };

    const handleRemove = (id: string) => {
        setDictionary(prev => prev.filter(entry => entry.id !== id));
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAdd();
        }
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportProgress(0);
        const reader = new FileReader();

        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) {
                setIsImporting(false);
                setImportProgress(null);
                return;
            }

            // Use an async function to process file off the main thread
            const processFile = async () => {
                try {
                    const existingOriginals = new Set(dictionary.map(item => item.original));
                    const newEntriesMap = new Map<string, string>();
                    const allLines = content.split(/\r?\n/);
                    
                    allLines.forEach(line => {
                        const parts = line.split('=');
                        if (parts.length !== 2) return;
                        const originalTerm = parts[0].trim();
                        const translationTerm = parts[1].trim();
                        
                        if (originalTerm && translationTerm && !existingOriginals.has(originalTerm) && !newEntriesMap.has(originalTerm)) {
                            newEntriesMap.set(originalTerm, translationTerm);
                        }
                    });
                    
                    const uniqueNewEntries = Array.from(newEntriesMap, ([original, translation]) => ({ original, translation }));
                    const totalNew = uniqueNewEntries.length;

                    if (totalNew === 0) {
                       setIsImporting(false);
                       setImportProgress(null);
                       return;
                    }

                    const CHUNK_SIZE = 5000;
                    for (let i = 0; i < totalNew; i += CHUNK_SIZE) {
                        const chunk = uniqueNewEntries.slice(i, i + CHUNK_SIZE);
                        const chunkWithIds = chunk.map(item => ({
                            ...item,
                            id: `${Date.now()}-${item.original}-${Math.random()}`
                        }));

                        setDictionary(prev => [...prev, ...chunkWithIds]);

                        const progress = Math.round(((i + chunk.length) / totalNew) * 100);
                        setImportProgress(progress);

                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                } catch (error) {
                    console.error("Lỗi khi thêm mục từ điển:", error);
                    alert("Đã xảy ra lỗi khi thêm mục từ điển.");
                } finally {
                    setIsImporting(false);
                    setImportProgress(null);
                }
            };
            
            processFile();
        };
        
        reader.onerror = (error) => {
            console.error("Lỗi khi đọc tệp:", error);
            alert("Đã xảy ra lỗi khi đọc tệp của bạn.");
            setIsImporting(false);
            setImportProgress(null);
        };
        
        reader.readAsText(file);
        
        if (e.target) {
            e.target.value = '';
        }
    };


    const handleExport = () => {
        if (dictionary.length === 0) return;

        const content = dictionary.map(entry => `${entry.original}=${entry.translation}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dictionary.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Card title="Từ Điển Tùy Chỉnh" step={4} optional>
            <div className="flex flex-col h-full space-y-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".txt"
                />
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleImportClick} disabled={isImporting} className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-sm py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isImporting ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                             <UploadIcon className="w-4 h-4" />
                        )}
                        {isImporting && importProgress !== null ? `Đang nhập... ${importProgress}%` : 'Nhập từ tệp'}
                    </button>
                    <button onClick={handleExport} disabled={dictionary.length === 0 || isImporting} className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-sm py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadIcon className="w-4 h-4" />
                        Xuất ra tệp
                    </button>
                </div>
                {isImporting && importProgress !== null && (
                    <div className="w-full bg-slate-700 rounded-full h-1.5 -mt-2">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                    </div>
                )}
                 <p className="text-xs text-center text-slate-500">Định dạng tệp: 'từ gốc=bản dịch' mỗi dòng</p>
                
                <div className="flex-grow flex flex-col space-y-2 overflow-hidden">
                    <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center px-2">
                         <div className="text-xs font-semibold text-slate-400">Thuật ngữ gốc</div>
                         <div className="text-xs font-semibold text-slate-400">Bản dịch Tiếng Việt</div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-2 max-h-60">
                        {dictionary.map(entry => (
                            <div key={entry.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center bg-slate-700/50 p-2 rounded">
                                <span className="text-sm truncate" title={entry.original}>{entry.original}</span>
                                <span className="text-sm truncate" title={entry.translation}>{entry.translation}</span>
                                <button onClick={() => handleRemove(entry.id)} className="text-slate-400 hover:text-red-400" disabled={isImporting}>
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                         {dictionary.length === 0 && !isImporting && (
                            <div className="flex items-center justify-center h-full text-sm text-slate-500">
                                Từ điển của bạn trống.
                            </div>
                        )}
                        {isImporting && (
                             <div className="flex items-center justify-center h-full text-sm text-slate-400">
                                Đang xử lý từ điển...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Thuật ngữ gốc" value={original} onChange={e => setOriginal(e.target.value)} onKeyPress={handleKeyPress} disabled={isImporting} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                    <input type="text" placeholder="Bản dịch" value={translation} onChange={e => setTranslation(e.target.value)} onKeyPress={handleKeyPress} disabled={isImporting} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                </div>
                <button onClick={handleAdd} disabled={isImporting} className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50">
                    <PlusIcon className="w-5 h-5"/>
                    Thêm vào Từ điển
                </button>
            </div>
        </Card>
    );
};