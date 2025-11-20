import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}

  /**
   * 标准聊天入口（文字 → 文字）
   *
   * 以后所有聊天，不管来自语音还是文字，都走这里。
   *
   * @param userText   当前用户这句话
   * @param sessionId  会话 ID（可选，后面做多轮对话用）
   * @param context    外部知识 / RAG 结果（可选，后面接检索用）
   * @returns          AI 回复的文本
   */
  async generateReply(
    userText: string,
    sessionId?: string,
    context?: string,
  ): Promise<string> {
    // 现在只做接口设计，还没接 OpenAI Chat 模型。
    // 后面会在这里调用 gpt-4o-mini 等。
    return 'Fake response (not yet integrated with Chat model)';
  }
}