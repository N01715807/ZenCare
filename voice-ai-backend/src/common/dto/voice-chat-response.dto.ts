// /voice/chat 的统一返回结构
export class VoiceChatResponseDto {
  // 会话 ID（可能是前端传的，也可能是后端生成的）
  sessionId: string;

  // STT 识别出来的用户文本
  userText: string;

  // Chat 模型生成的回复文本
  replyText: string;

  // TTS 生成的音频（base64 编码）
  audioBase64: string;
}
