
import React from 'react';
import { Card } from './Card';
import { ChevronDownIcon } from './icons';
import type { Dispatch, SetStateAction } from 'react';

interface ModelSelectorProps {
    model: string;
    setModel: Dispatch<SetStateAction<string>>;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ model, setModel }) => {
    return (
        <Card title="Chọn Model AI" step={2}>
            <div className="relative">
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh & Hiệu quả)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Chất lượng cao)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                   <ChevronDownIcon className="w-5 h-5"/>
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Chọn model phù hợp với nhu cầu. 'Flash' nhanh hơn, trong khi 'Pro' cho kết quả chất lượng cao hơn.</p>
        </Card>
    );
};
