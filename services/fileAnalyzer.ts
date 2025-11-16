import type { AnalyzedFile, ChapterInfo } from '../types';

// Chuyển đổi chữ số toàn chiều rộng sang chữ số bán chiều rộng tiêu chuẩn.
const normalizeFullWidthNumbers = (text: string): string => {
    const fullWidthMap: { [key: string]: string } = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9' };
    return text.replace(/[０-９]/g, (char) => fullWidthMap[char]);
};

// Chuyển đổi một chuỗi số La Mã thành một số nguyên.
const romanToInteger = (roman: string): number => {
    const romanMap: { [key: string]: number } = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let num = 0;
    const upperRoman = roman.toUpperCase();
    for (let i = 0; i < upperRoman.length; i++) {
        const current = romanMap[upperRoman[i]];
        const next = romanMap[upperRoman[i + 1]];
        if (current < next) {
            num -= current;
        } else {
            num += current;
        }
    }
    return num;
};

// Phân tích một chuỗi có thể là số Ả Rập hoặc La Mã.
const parseChapterNumberString = (s: string): number | null => {
    const normalized = s.trim();
    if (/^\d+$/.test(normalized)) {
        return parseInt(normalized, 10);
    }
    if (/^[IVXLCDM]+$/i.test(normalized)) {
        return romanToInteger(normalized);
    }
    return null;
};

// Một biểu thức chính quy duy nhất, mạnh mẽ để tìm và phân tích các tiêu đề chương trong một lần.
// Ghi lại: 1: Số chương (Ả Rập hoặc La Mã), 2: Tên chương
const headingMatchPattern = /^\s*(?:[#*_\-~]{0,5}\s*)?(?:\*\*)?\s*(?:chương|chapter|ch\.|c)\s*(?:[:.\-–—]?\s*)(\d{1,5}|[IVXLCDM]+)\b(.*)$/gim;


// Mẫu cũ để phân tích tên tệp, được sử dụng làm phương án dự phòng.
const fileNamePatterns = [
    /^\W*(?:Chương|Chapter|Ch\.|C)\s*(\d+)\s*[-:–—\s]*(.*?)\W*\.txt$/i,
    /^\W*(\d+)\s*[-:–—.]*\s*(.*?)\W*\.txt$/i,
];

/**
 * Phân tích tên tệp làm phương án dự phòng nếu phân tích nội dung thất bại.
 */
function analyzeFileName(fileName: string): { number: number | null; name: string | null } {
    for (const pattern of fileNamePatterns) {
        const match = fileName.match(pattern);
        if (match) {
            const number = parseInt(match[1], 10);
            const name = (match[2] || '').trim().replace(/_/g, ' ');
            return { number, name: name || null };
        }
    }
    return { number: null, name: null };
}


/**
 * Phân tích một mảng tệp. Nếu một tệp chứa nhiều chương, nó sẽ chia chúng thành các đối tượng tệp riêng biệt.
 */
export const analyzeFiles = async (files: File[], mode: 'single' | 'multiple'): Promise<AnalyzedFile[]> => {
    if (files.length === 0) return [];

    let resultingChapters: AnalyzedFile[] = [];

    for (const file of files) {
        let content = await file.text();
        // Chuẩn hóa các dấu xuống dòng thành LF (\n) để đảm bảo khớp regex nhất quán với cờ 'm'.
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Chuẩn hóa các chữ số toàn chiều rộng.
        content = normalizeFullWidthNumbers(content);

        const headingMatches = [...content.matchAll(headingMatchPattern)];

        if (headingMatches.length > 0) {
            // Tệp này chứa ít nhất một tiêu đề chương. Xử lý theo nội dung.
            
            // Xử lý nội dung trước chương đầu tiên như một phần giới thiệu.
            if (headingMatches[0].index! > 0) {
                const introContent = content.substring(0, headingMatches[0].index!).trim();
                if (introContent.length > 50) { // Ngưỡng tùy ý để tránh các dòng trống, v.v.
                     const introFile = new File([introContent], "Chương 0 - Giới thiệu.txt", { type: 'text/plain' });
                     resultingChapters.push({
                        file: introFile,
                        info: { number: 0, name: "Giới thiệu", status: 'ok' }
                    });
                }
            }

            // Xử lý từng chương.
            for (let i = 0; i < headingMatches.length; i++) {
                const match = headingMatches[i];
                const startIndex = match.index!;
                const endIndex = (i + 1 < headingMatches.length) ? headingMatches[i + 1].index : content.length;
                
                const chapterContent = content.substring(startIndex, endIndex);
                
                // Trích xuất trực tiếp từ kết quả khớp, không cần phân tích lại.
                const numberStr = match[1];
                const rawName = match[2] || '';
                
                // Dọn dẹp tên đã bắt được một cách mạnh mẽ
                const name = rawName
                    .trim()
                    .replace(/^[\s:.\-–—]+/, '') // Xóa các dấu phân cách ở đầu
                    .replace(/[#*_\-~`\.]+$/, '') // Xóa các ký tự markdown/dấu câu ở cuối
                    .trim() || null;

                const number = parseChapterNumberString(numberStr);

                if (number !== null) {
                    const newFileName = `Chương ${String(number).padStart(3, '0')}${name ? ` - ${name}` : ''}.txt`;
                    const newFile = new File([chapterContent.trim()], newFileName, { type: 'text/plain' });
                    resultingChapters.push({
                        file: newFile,
                        info: { number, name, status: 'ok' }
                    });
                }
            }
        } else {
             // Không tìm thấy tiêu đề chương trong nội dung.
            if (mode === 'single') {
                // Nếu ở chế độ một tệp, hãy coi toàn bộ tệp là một chương.
                resultingChapters.push({
                    file: file,
                    info: {
                        number: 1,
                        name: file.name.replace(/\.txt$/i, ''),
                        status: 'ok',
                        message: 'Toàn bộ tệp được coi là một chương.'
                    }
                });
            } else {
                 // Nếu ở chế độ nhiều tệp, quay lại phân tích tên tệp cho tệp cụ thể này.
                const { number, name } = analyzeFileName(file.name);
                resultingChapters.push({
                    file,
                    info: {
                        number,
                        name,
                        status: number !== null ? 'ok' : 'warning',
                        message: number === null ? 'Không nhận dạng được chương.' : undefined,
                    }
                });
            }
        }
    }
    
    // Sắp xếp tất cả các chương đã tìm thấy.
    resultingChapters.sort((a, b) => {
        if (a.info.number === null && b.info.number === null) return a.file.name.localeCompare(b.file.name);
        if (a.info.number === null) return 1;
        if (b.info.number === null) return -1;
        return a.info.number - b.info.number;
    });

    // Hậu xử lý: Kiểm tra các khoảng trống và bản sao
    let lastChapterNumber: number | null = null;
    const seenNumbers = new Set<number>();

    for (const item of resultingChapters) {
        if (item.info.number !== null) {
            // Kiểm tra các bản sao
            if (seenNumbers.has(item.info.number)) {
                item.info.status = 'warning';
                item.info.message = `Cảnh báo: Trùng lặp số chương (${item.info.number}).`;
                continue; // Không sử dụng cái này để kiểm tra khoảng trống
            }
            seenNumbers.add(item.info.number);

            // Kiểm tra các khoảng trống
            if (lastChapterNumber !== null && item.info.number > lastChapterNumber + 1 && item.info.number !== 0) { // Bỏ qua khoảng trống cho chương 0
                // Đính kèm cảnh báo vào mục hiện tại
                item.info.status = 'warning';
                item.info.message = (item.info.message ? item.info.message + ' ' : '') + `Cảnh báo: Thiếu chương từ ${lastChapterNumber + 1} đến ${item.info.number - 1}.`;
            }
            lastChapterNumber = item.info.number;
        }
    }

    return resultingChapters;
};