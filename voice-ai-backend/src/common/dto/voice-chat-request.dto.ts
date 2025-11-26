// 语音聊天请求里，除了音频文件以外的字段。
// 文件通过 @UploadedFile() 取，这里只管普通字段。
export class VoiceChatRequestDto {
  // 使用哪种音色（比如 synthex / mechaX / ioncore）
  voice: string;

  // 会话 ID，可选。前端不传就由后端生成一个。
  sessionId?: string;

  profile?: string; 
}