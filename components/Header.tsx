import React from 'react';
import { BookOpenIcon, SaveIcon, FolderOpenIcon } from './icons';

interface HeaderProps {
    onSaveSettings: () => void;
    onLoadSettings: () => void;
    onSaveSession: () => void;
    onLoadSession: () => void;
    isSessionActive: boolean;
    isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSaveSettings, onLoadSettings, onSaveSession, onLoadSession, isSessionActive, isLoading }) => {
    return (
        <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 text-white">
            <div className="flex items-center gap-4">
                 <div className="bg-blue-600 p-3 rounded-lg flex-shrink-0">
                    <BookOpenIcon className="w-8 h-8"/>
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Trình Biên Tập Dịch Thuật</h1>
                    <p className="text-slate-400 mt-1">Dịch và biên tập với Gemini</p>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-start sm:justify-end">
                <button onClick={onSaveSettings} disabled={isLoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <SaveIcon className="w-5 h-5" />
                    Lưu Cài Đặt
                </button>
                 <button onClick={onLoadSettings} disabled={isLoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <FolderOpenIcon className="w-5 h-5" />
                    Tải Cài Đặt
                </button>
                <div className="w-px h-6 bg-slate-600 hidden sm:block"></div>
                <button onClick={onSaveSession} disabled={!isSessionActive || isLoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <SaveIcon className="w-5 h-5" />
                    Lưu Phiên Dịch
                </button>
                 <button onClick={onLoadSession} disabled={isLoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <FolderOpenIcon className="w-5 h-5" />
                    Tải Phiên Dịch
                </button>
            </div>
        </header>
    );
};