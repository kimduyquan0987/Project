
import React from 'react';
import { Card } from './Card';
import type { ProcessingSettings } from '../types';
import type { Dispatch, SetStateAction } from 'react';

interface ToggleProps {
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleProps> = ({ label, description, enabled, onChange }) => (
    <div>
        <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{label}</span>
            <button
                type="button"
                className={`${enabled ? 'bg-blue-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                role="switch"
                aria-checked={enabled}
                onClick={() => onChange(!enabled)}
            >
                <span
                    aria-hidden="true"
                    className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
    </div>
);


interface ProcessingOptionsProps {
    settings: ProcessingSettings;
    setSettings: Dispatch<SetStateAction<ProcessingSettings>>;
}

export const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({ settings, setSettings }) => {
    const handleChange = (field: keyof ProcessingSettings, value: boolean | number) => {
        setSettings(prev => ({...prev, [field]: value}));
    }
    
    return (
        <Card title="Xử Lý Bổ Sung" step={5} optional>
            <div className="space-y-6">
                <ToggleSwitch 
                    label="Kiểm tra & Dịch lại ký tự sót"
                    description="Tự động tìm và dịch lại các ký tự ngoại ngữ (Trung, Nhật, Hàn, Nga) còn sót trong kết quả."
                    enabled={settings.checkAndRedo}
                    onChange={(val) => handleChange('checkAndRedo', val)}
                />
                 <ToggleSwitch 
                    label="Kiểm tra & Sửa lỗi ngữ pháp"
                    description="Sử dụng AI để rà soát và sửa động từ, các cấu trúc câu, các lỗi chính tả, ngữ pháp trong bản dịch."
                    enabled={settings.fixGrammar}
                    onChange={(val) => handleChange('fixGrammar', val)}
                />
                <div>
                    <ToggleSwitch 
                        label="Tách tệp để dịch"
                        description="Chia nhỏ các tệp lớn thành nhiều đoạn để dịch tuần tự, hữu ích để tránh giới hạn của model."
                        enabled={settings.enableChunking}
                        onChange={(val) => handleChange('enableChunking', val)}
                    />
                    {settings.enableChunking && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-700">
                             <label htmlFor="chunk-size-slider" className="text-sm text-slate-400">Kích thước mỗi đoạn (ký tự):</label>
                             <div className="flex items-center gap-4">
                                <input id="chunk-size-slider" type="range" min="2000" max="15000" step="500" value={settings.chunkSize} onChange={(e) => handleChange('chunkSize', parseInt(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
                                <span className="font-semibold text-blue-400 w-16 text-right">{settings.chunkSize.toLocaleString()}</span>
                             </div>
                        </div>
                    )}
                 </div>
                 <div>
                    <ToggleSwitch 
                        label="Cảnh báo dịch thiếu nội dung"
                        description="So sánh độ dài giữa bản gốc và bản dịch để phát hiện khả năng dịch thiếu sót."
                        enabled={settings.warnMissingContent}
                        onChange={(val) => handleChange('warnMissingContent', val)}
                    />
                    {settings.warnMissingContent && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-700">
                             <label htmlFor="threshold-slider" className="text-sm text-slate-400">Cảnh báo nếu bản dịch ngắn hơn bản gốc:</label>
                             <div className="flex items-center gap-4">
                                <input id="threshold-slider" type="range" min="10" max="90" step="5" value={settings.missingContentThreshold} onChange={(e) => handleChange('missingContentThreshold', parseInt(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
                                <span className="font-semibold text-blue-400">{settings.missingContentThreshold}%</span>
                             </div>
                        </div>
                    )}
                 </div>
            </div>
             <p className="text-xs text-slate-500 mt-6">Lưu ý: các tính năng này có thể làm tăng thời gian xử lý và chi phí API.</p>
        </Card>
    );
};
