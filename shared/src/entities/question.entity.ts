import {Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, Relation} from 'typeorm';
import {Answer} from './answer.entity.js';
import {Round} from "./round.entity.js";

@Entity('questions')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    text: string;

    @Column({nullable: true})
    explanation?: string;

    @Column()
    category: string;

    @Column()
    introduction: string;

    @Column()
    order: number;

    @Column({type: 'bytea', nullable: true})
    image: Buffer;

    @Column({nullable: true})
    imageMimeType: string;

    @ManyToOne(() => Round, (round) => round.questions, {nullable: true})
    round?: Relation<Round>;
    
    // dto field
    roundId?: string;

    @OneToMany(() => Answer, answer => answer.question, {cascade: true})
    answers: Answer[];
} 