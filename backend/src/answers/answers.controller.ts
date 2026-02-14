import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnswersService } from './answers.service.js';
import { Answer } from '@quiz/shared';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Get()
  async findAll(): Promise<Answer[]> {
    return this.answersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Answer> {
    return this.answersService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() answerData: Partial<Answer>,
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
  ): Promise<Answer> {
    if (file) {
      answerData.image = file.buffer;
      answerData.imageMimeType = file.mimetype;
    }
    return this.answersService.create(answerData);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() answerData: Partial<Answer>,
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
  ): Promise<Answer> {
    if (file) {
      console.log('--- UPDATE: File received ---');
      console.log('Filename:', file.originalname);
      console.log('Mimetype:', file.mimetype);
      console.log('Size:', file.size);
      console.log('Buffer length:', file.buffer?.length); // Wichtig: Länge prüfen

      // Logge den Anfang des Buffers als String, um zu sehen, ob es XML ist
      try {
        const bufferStart = file.buffer?.slice(0, 150).toString('utf-8'); // Oder 'ascii'
        console.log('Buffer start:', bufferStart); // SIEHT DAS WIE XML AUS?
      } catch (e) {
        console.error('Error reading buffer start:', e);
      }

      // Weise den Buffer zu (wie bisher)
      answerData.image = file.buffer;
      answerData.imageMimeType = file.mimetype;
    } else {
      console.log('--- UPDATE: No file received ---');
    }

    // Logge, was an den Service geht
    console.log('--- UPDATE: Data to service ---', {
      ...answerData,
      image: answerData.image ? `Buffer length: ${answerData.image.length}` : 'null'
    });
    return this.answersService.update(id, answerData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.answersService.remove(id);
  }
}
