import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from '@quiz/shared';
import { QuestionsService } from '../questions/questions.service.js';

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly questionsService: QuestionsService,
  ) {}

  async findAll(): Promise<Answer[]> {
    return this.answerRepository.find();
  }

  async findAllByQuestionId(questionId: string): Promise<Answer[]> {
    return this.answerRepository.find({
        where: { question: { id: questionId } },
        order: { order: 'ASC' },
    })
  }

  async findOne(id: string): Promise<Answer> {
    const answer = await this.answerRepository.findOne({ where: { id } });
    if (!answer) {
      throw new NotFoundException(`Answer with ID "${id}" not found`);
    }
    return answer;
  }

  async create(answerData: Partial<Answer>): Promise<Answer> {
    if (!answerData.question) {
      throw new BadRequestException('Question ID is required');
    }

    const answer = this.answerRepository.create(answerData);
    return this.answerRepository.save(answer);
  }

  async update(id: string, answerData: Partial<Answer>): Promise<Answer> {
    await this.answerRepository.update(id, answerData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.answerRepository.delete(id);
  }
}
