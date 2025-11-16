
import { GoogleGenAI } from "@google/genai";
import type { TranslationConfig } from '../types';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateText = async (text: string, config: TranslationConfig): Promise<string> => {
    const ai = getAi();

    let instruction = `${config.promptSettings.prompt}\n\n---`;

    if (config.promptSettings.storyName) instruction += `\nTên truyện: ${config.promptSettings.storyName}`;
    if (config.promptSettings.author) instruction += `\nTác giả: ${config.promptSettings.author}`;
    if (config.promptSettings.genre) instruction += `\nThể loại: ${config.promptSettings.genre}`;
    if (config.promptSettings.sourceLanguage) instruction += `\nNgôn ngữ gốc: ${config.promptSettings.sourceLanguage}`;

    if (config.dictionary.length > 0) {
        const dictionaryString = config.dictionary.map(d => `- "${d.original}": "${d.translation}"`).join('\n');
        instruction += `\n\nQUAN TRỌNG: Phải sử dụng từ điển tùy chỉnh sau đây cho các thuật ngữ được liệt kê. Dịch chính xác như được cung cấp:\n${dictionaryString}`;
    }
    
    const processingInstructions: string[] = [];
    if (config.processingSettings.checkAndRedo) {
        processingInstructions.push(`- SAU KHI DỊCH, rà soát kỹ lưỡng để đảm bảo không còn sót bất kỳ ký tự ngoại ngữ nào (ví dụ: 中, 日, 한, р). Phải dịch tất cả sang tiếng Việt.`);
    }
    if (config.processingSettings.fixGrammar) {
        processingInstructions.push(`- SAU KHI DỊCH, kiểm tra và sửa lại toàn bộ các lỗi chính tả, ngữ pháp, và cấu trúc câu để đảm bảo văn bản cuối cùng mạch lạc, tự nhiên và đúng chuẩn tiếng Việt.`);
    }

    if (processingInstructions.length > 0) {
        instruction += `\n\nYÊU CẦU XỬ LÝ BỔ SUNG:\n${processingInstructions.join('\n')}`;
    }

    const fullPrompt = `${instruction}\n---\n\nNỘI DUNG CẦN DỊCH:\n\n${text}`;

    try {
        const response = await ai.models.generateContent({
            model: config.model,
            contents: fullPrompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('permission'))) {
            throw new Error("Lỗi API: API key không hợp lệ hoặc bị thiếu. Vui lòng kiểm tra lại.");
        }
        throw new Error("Không thể dịch văn bản bằng Gemini API. Vui lòng thử lại sau.");
    }
};
