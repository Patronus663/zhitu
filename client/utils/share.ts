import { Share, Platform, Alert } from 'react-native';

export interface ShareableQuestion {
  subject?: string;
  content: string;
  answer?: string;
  wrong_answer?: string;
  error_analysis?: string;
}

function formatQuestion(q: ShareableQuestion): string {
  const parts = [
    q.subject ? `【${q.subject}】` : '',
    q.content,
    q.wrong_answer ? `我的错误答案：${q.wrong_answer}` : '',
    q.answer ? `正确解答：\n${q.answer}` : '',
    q.error_analysis ? `错因分析：${q.error_analysis}` : '',
    '—— 来自知途 App',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export async function shareQuestion(q: ShareableQuestion): Promise<void> {
  const message = formatQuestion(q);
  if (Platform.OS === 'web') {
    // Web: 优先调用系统分享，否则退化为复制到剪贴板
    try {
      const nav = navigator as any;
      if (nav?.share) {
        await nav.share({ title: '知途错题分享', text: message });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        Alert.alert('已复制', '题目内容已复制到剪贴板');
      } else {
        Alert.alert('提示', '当前浏览器不支持分享');
      }
    } catch {
      // 用户取消分享
    }
    return;
  }
  try {
    await Share.share({ title: '知途错题分享', message });
  } catch {
    // 用户取消分享
  }
}
