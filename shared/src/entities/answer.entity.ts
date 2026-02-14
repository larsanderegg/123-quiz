import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation} from 'typeorm';
import {Question} from "./question.entity.js";

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column()
  isCorrect: boolean;

  @ManyToOne(() => Question, (question) => question.answers)
  question: Relation<Question>;

  @Column({ type: 'bytea', nullable: true })
  image: Buffer;

  @Column({ nullable: true })
  imageMimeType: string;

  @Column({ type: 'int', nullable: true })
  order: number;
} 