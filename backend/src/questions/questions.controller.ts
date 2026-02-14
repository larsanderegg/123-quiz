import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service.js';
import { Question } from '@quiz/shared';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(): Promise<Question[]> {
    return this.questionsService.findAll();
  }

  @Get('round/:roundId')
  async findAllByRound(@Param('roundId') roundId: string): Promise<Question[]> {
    return this.questionsService.findAllByRound(roundId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Question> {
    return this.questionsService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() questionData: Partial<Question>,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ): Promise<Question> {
    if (file) {
      questionData.image = file.buffer;
      questionData.imageMimeType = file.mimetype;
    }
    return this.questionsService.create(questionData);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() questionData: Partial<Question>,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ): Promise<Question> {
    if (file) {
      questionData.image = file.buffer;
      questionData.imageMimeType = file.mimetype;
    }
    return this.questionsService.update(id, questionData);
  }

  @Put(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  async updateImage(
      @Param('id') id: string,
      @UploadedFile(
          new ParseFilePipe({
            validators: [
              new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
              new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
            ],
            fileIsRequired: false,
          }),
      )
      file?: Express.Multer.File,
  ): Promise<Question> {
    const question = await this.questionsService.findOne(id)
    if (file) {
      question.image = file.buffer;
      question.imageMimeType = file.mimetype;
    }
    return this.questionsService.update(id, question);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.questionsService.remove(id);
  }
}
