import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer, Question, Round } from '@quiz/shared'; // Annahme: Diese sind aktualisiert

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  // ... findAll, findOne, create, remove bleiben wie zuvor ...
  async findAll(): Promise<Question[]> {
    const questions = await this.questionRepository.find({
      relations: ['answers', 'round'],
    });
    questions.forEach((q) =>
      q.answers?.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)),
    );
    return questions;
  }

  async findOne(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['answers', 'round'],
    });
    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
    question.answers?.sort(
      (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity),
    );
    return question;
  }

  async create(questionData: Partial<Question>): Promise<Question> {
    // lade Runde, wenn eine ID angegeben ist
    if (questionData.roundId) {
      questionData.round = await this.roundRepository.findOneByOrFail({
        id: questionData.roundId,
      });
    }

    // 1. Extrahiere Antwortdaten und erstelle die Frage-Instanz ohne Antworten
    const { answers: answersData, ...questionOnlyData } = questionData;
    const questionInstance = this.questionRepository.create(questionOnlyData);

    // 2. Speichere die Frage-Instanz zuerst, um eine ID zu bekommen
    const savedQuestion = await this.questionRepository.save(questionInstance);

    // 3. Wenn Antwortdaten vorhanden sind, erstelle und speichere sie jetzt
    if (answersData && answersData.length > 0) {
      const answerInstances = answersData.map((answerData) => {
        // Erstelle jede Antwort und verknüpfe sie mit der gespeicherten Frage (savedQuestion)
        return this.answerRepository.create({
          ...answerData,
          question: savedQuestion, // Wichtig: Benutze die gespeicherte Instanz mit ID
        });
      });
      // Speichere alle neuen Antwort-Instanzen
      await this.answerRepository.save(answerInstances);
    }

    // 4. Lade die Frage erneut mit den (jetzt gespeicherten) Antworten, um das vollständige Objekt zurückzugeben
    //    Dies ist der sicherste Weg, um den finalen Zustand zu erhalten.
    return this.findOne(savedQuestion.id);
  }

  async update(id: string, questionData: Partial<Question>): Promise<Question> {
    const questionToUpdate = await this.questionRepository.findOne({
      where: { id },
      relations: ['answers'], // Lade Antworten für die spätere Verarbeitung mit
    });

    if (!questionToUpdate) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }

    // lade Runde, wenn eine ID angegeben ist
    if (questionData.roundId) {
      questionData.round = await this.roundRepository.findOneByOrFail({
        id: questionData.roundId,
      });
    }

    const { answers: updatedAnswersData, ...questionOnlyData } = questionData;

    // 1. Merge die Änderungen für die Frage selbst (inkl. 'text')
    this.questionRepository.merge(questionToUpdate, questionOnlyData);

    // 2. Speichere die Änderungen an der Frage EXPLIZIT
    //    Wichtig: Tue dies *bevor* du die Antworten verarbeitest, falls Antwort-Logik
    //    die gespeicherte Frage benötigt oder auf Kaskadierung angewiesen ist.
    await this.questionRepository.save(questionToUpdate);

    // 3. Verarbeite die Antworten (falls vorhanden)
    if (updatedAnswersData) {
      const existingAnswers = questionToUpdate.answers || []; // Nimm die bereits geladenen Antworten
      const answerPromises: Promise<Answer>[] = [];

      for (const answerData of updatedAnswersData) {
        if (answerData.id) {
          const existingAnswer = existingAnswers.find(
            (a) => a.id === answerData.id,
          );
          if (existingAnswer) {
            const updatedAnswer = this.answerRepository.merge(
              existingAnswer,
              answerData,
            );
            answerPromises.push(this.answerRepository.save(updatedAnswer));
          } else {
            throw new BadRequestException(
              `Answer with ID "${answerData.id}" not found for this question.`,
            );
          }
        } else {
          // Wichtig: Stelle sicher, dass die Frage-Instanz aktuell ist (frisch gespeichert)
          const newAnswer = this.answerRepository.create({
            ...answerData,
            question: questionToUpdate, // Verwende die gespeicherte questionToUpdate Instanz
          });
          answerPromises.push(this.answerRepository.save(newAnswer));
        }
      }

      // Warte auf alle Antwort-Operationen
      await Promise.all(answerPromises);

      // (Optional) Entferne nicht mehr vorhandene Antworten
      const answerIdsToKeep = updatedAnswersData
        .map((a) => a.id)
        .filter((id) => !!id);
      const answersToRemove = existingAnswers.filter(
        (a) => !answerIdsToKeep.includes(a.id),
      );

      if (answersToRemove.length > 0) {
        await this.answerRepository.remove(answersToRemove);
      }
    }
    // 4. Lade die Frage final neu, um den konsistenten Zustand zurückzugeben
    //    Dies stellt sicher, dass alle Änderungen (Frage + Antworten) reflektiert werden.
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const question = await this.questionRepository.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
    await this.questionRepository.remove(question);
  }

  findAllByRound(roundId: string) {
    return this.questionRepository.find({
      where: { round: { id: roundId } },
      relations: ['answers'],
    })
  }
}