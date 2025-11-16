
import React, { useState } from 'react';
import { Card } from './Card';
import { ChevronDownIcon } from './icons';
import type { PromptSettings } from '../types';
import type { Dispatch, SetStateAction } from 'react';

interface PromptEditorProps {
    settings: PromptSettings;
    setSettings: Dispatch<SetStateAction<PromptSettings>>;
}

const InputField: React.FC<{ label: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, placeholder, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <input 
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);


export const PromptEditor: React.FC<PromptEditorProps> = ({ settings, setSettings }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleChange = (field: keyof PromptSettings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Card title="Tùy Chỉnh Prompt" step={3}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Tên truyện:" placeholder="VD: Anh Hùng Xạ Điêu" value={settings.storyName} onChange={(e) => handleChange('storyName', e.target.value)} />
                    <InputField label="Tác giả:" placeholder="VD: Kim Dung" value={settings.author} onChange={(e) => handleChange('author', e.target.value)} />
                    <InputField label="Thể loại:" placeholder="VD: Kiếm hiệp, Tiên hiệp" value={settings.genre} onChange={(e) => handleChange('genre', e.target.value)} />
                    <InputField label="Ngôn ngữ gốc:" placeholder="VD: Tiếng Trung" value={settings.sourceLanguage} onChange={(e) => handleChange('sourceLanguage', e.target.value)} />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-400">Prompt Dịch Thuật:</label>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                            <ChevronDownIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {isExpanded && (
                        <textarea
                            value={settings.prompt}
                            onChange={(e) => handleChange('prompt', e.target.value)}
                            rows={8}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    )}
                </div>
            </div>
        </Card>
    );
};
