
import React from 'react';

interface CardProps {
    title: string;
    step: number;
    optional?: boolean;
    children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, step, optional = false, children }) => {
    return (
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">
                <span className="text-blue-400">{step}.</span> {title}
                {optional && <span className="text-sm font-normal text-slate-400 ml-2">(Tùy chọn)</span>}
            </h2>
            <div className="flex-grow">
                {children}
            </div>
        </section>
    );
};
