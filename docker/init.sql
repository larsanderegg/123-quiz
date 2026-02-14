-- Create questions table
CREATE TABLE rounds (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name TEXT NOT NULL,
   audioPath TEXT NOT NULL,
   backgroundImagePath TEXT,
   "order" INT
);

-- Create questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    introduction TEXT NOT NULL,
    image BYTEA,
    image_mime_type TEXT,
    "order" INT,
    round_id UUID REFERENCES rounds(id)
);

-- Create answers table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    image BYTEA,
    image_mime_type TEXT,
    "order" INT
);

-- Create indexes
CREATE INDEX idx_answers_question_id ON answers(question_id);