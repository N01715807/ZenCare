import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { VoiceService } from './voice.service';
import { SttService } from '../ai/stt/stt.service';
import { ChatService } from '../ai/chat/chat.service';
import { TtsService } from '../ai/tts/tts.service';
import { ConfigService } from '../config/config.service';

import { VoiceChatRequestDto } from '../common/dto/voice-chat-request.dto';
import { VoiceChatResponseDto } from '../common/dto/voice-chat-response.dto';
import { VoiceGreetRequestDto } from '../common/dto/voice-greet-request.dto';
import { VoiceGreetResponseDto } from '../common/dto/voice-greet-response.dto';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly sttService: SttService,
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService,
    private readonly configService: ConfigService, // Validate allowed voices
  ) {}

  /**
   * Auto-greeting when the voice chat page loads.
   * POST /voice/greet
   */
  @Post('greet')
  async greet(
    @Body() body: VoiceGreetRequestDto,
  ): Promise<VoiceGreetResponseDto> {
    if (!body.voice) throw new BadRequestException('voice is required');
    if (!body.sessionId)
      throw new BadRequestException('sessionId is required');

    const result = await this.voiceService.greetWithProfile({
      voice: body.voice,
      sessionId: body.sessionId,
      profileText: body.profile,
    });

    return result;
  }

  /**
   * Voice preview: plays a short demo line.
   * GET /voice/sample?voice=alloy&name=Roc
   *
   * The preview line is:
   *   "Did you miss me, {name}?"
   */
  @Get('sample')
  async sample(
    @Query('voice') voice?: string,
    @Query('name') name?: string,
  ): Promise<{ audioBase64: string }> {
    if (!voice) throw new BadRequestException('voice is required');

    if (!this.configService.isSupportedVoice(voice)) {
      throw new BadRequestException(`Unsupported voice: ${voice}`);
    }

    const displayName = name || 'friend';
    const sampleText = `Did you miss me, ${displayName}?`;

    const buf = await this.ttsService.synthesizeSpeech(sampleText, voice);
    return { audioBase64: buf.toString('base64') };
  }

  /**
   * Debug: STT
   */
  @Post('debug/stt')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async debugStt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('audio file is required');

    const text = await this.sttService.transcribeAudio(file.buffer);
    return { text };
  }

  /**
   * Debug: Chat
   */
  @Post('debug/chat')
  async debugChat(
    @Body() body: { text?: string; sessionId?: string; context?: string },
  ): Promise<{ replyText: string }> {
    if (!body.text) throw new BadRequestException('text is required');

    const replyText = await this.chatService.generateReply(
      body.text,
      body.sessionId,
      body.context,
    );

    return { replyText };
  }

  /**
   * Debug: TTS
   */
  @Post('debug/tts')
  async debugTts(
    @Body() body: { text?: string; voice?: string },
  ): Promise<{ audioBase64: string }> {
    if (!body.text) throw new BadRequestException('text is required');
    if (!body.voice) throw new BadRequestException('voice is required');

    const audioBuffer = await this.ttsService.synthesizeSpeech(
      body.text,
      body.voice,
    );

    return { audioBase64: audioBuffer.toString('base64') };
  }

  /**
   * Main voice chat pipeline:
   * POST /voice/chat
   *
   * form-data:
   *   audio: file
   *   voice: string
   *   sessionId?: string
   *   profile?: string(JSON)
   */
    @Post('chat')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async chat(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: VoiceChatRequestDto,
  ): Promise<VoiceChatResponseDto> {
    if (!file) throw new BadRequestException('audio file is required');
    if (!body.voice) throw new BadRequestException('voice is required');

    const result = await this.voiceService.handleVoiceChat({
      audioBuffer: file.buffer,
      voice: body.voice,
      sessionId: body.sessionId,
      profileText: body.profile,
    });

    return result;
  }
}
