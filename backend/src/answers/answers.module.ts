import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswersController } from './answers.controller.js';
import { AnswersService } from './answers.service.js';
import { Answer } from '@quiz/shared';
import { QuestionsModule } from '../questions/questions.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Answer]),
    QuestionsModule
  ],
  controllers: [AnswersController],
  providers: [AnswersService],
  exports: [AnswersService],
})
export class AnswersModule {}
