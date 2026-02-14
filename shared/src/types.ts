import { Answer } from './entities/answer.entity.js';
import { Question } from './entities/question.entity.js';
import {Round} from "./entities/round.entity.js";
import {LedControlMode} from "./entities/led-control.enum.js";

export type QuestionType = Question;
export type AnswerType = Answer;
export type RoundType = Round;
export type LedControlModeType = LedControlMode;