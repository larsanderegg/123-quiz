import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import {Question} from "./question.entity.js";

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  order: number;

  @Column()
  audioPath: string;

  @Column({ nullable: true })
  backgroundImagePath?: string;

  @OneToMany(() => Question, question => question.round, { cascade: false })
  questions: Question[];
} 