import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Layers,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Award,
  Lightbulb,
} from 'lucide-react';
import { StudyGrade, StudyFlashcard } from '../types';

interface StudyModePanelProps {
  currentGrade: StudyGrade;
  onSelectGrade: (grade: StudyGrade) => void;
  onLaunchStudyChat: (prompt: string, grade: StudyGrade) => void;
}

const GRADE_OPTIONS: { id: StudyGrade; label: string; desc: string; isHighlight?: boolean }[] = [
  { id: 'class-1-5', label: 'Class 1-5', desc: 'Foundations & simple visuals' },
  { id: 'class-6', label: 'Class 6', desc: 'Early middle school concepts' },
  { id: 'class-7', label: 'Class 7 ⭐', desc: 'Middle school algebra, science, & logic', isHighlight: true },
  { id: 'class-8', label: 'Class 8', desc: 'Pre-high school problem solving' },
  { id: 'class-9', label: 'Class 9', desc: 'Secondary school curriculum' },
  { id: 'class-10', label: 'Class 10', desc: 'Board exam preparation & math/science' },
  { id: 'class-11-12', label: 'Class 11-12', desc: 'Calculus, Physics, Chemistry, CS' },
  { id: 'college', label: 'College', desc: 'Higher education & technical research' },
];

const SAMPLE_FLASHCARDS: StudyFlashcard[] = [
  {
    id: 'fc-1',
    question: 'Class 7 Science: What are the three primary components needed for Photosynthesis?',
    answer: 'Carbon Dioxide (CO₂), Water (H₂O), and Sunlight (absorbed by chlorophyll in chloroplasts). The reaction produces Glucose and Oxygen!',
    grade: 'Class 7',
    topic: 'Science / Biology',
  },
  {
    id: 'fc-2',
    question: 'Class 7 Math: What is the rule for multiplying two negative integers?',
    answer: 'When two negative integers are multiplied, the result is ALWAYS positive! For example: (-4) × (-5) = +20.',
    grade: 'Class 7',
    topic: 'Integers',
  },
  {
    id: 'fc-3',
    question: 'Class 7 Physics: What is the standard formula for calculating Speed?',
    answer: 'Speed = Total Distance Covered ÷ Total Time Taken (Speed = d / t). The SI unit is meters per second (m/s) or km/h.',
    grade: 'Class 7',
    topic: 'Motion and Time',
  },
];

export const StudyModePanel: React.FC<StudyModePanelProps> = ({
  currentGrade,
  onSelectGrade,
  onLaunchStudyChat,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [activeTask, setActiveTask] = useState<'homework' | 'quiz' | 'flashcards' | 'summary'>('homework');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeGradeObj = GRADE_OPTIONS.find((g) => g.id === currentGrade) || GRADE_OPTIONS[2];

  const handleLaunch = () => {
    const topic = topicInput.trim() || 'Fractions, Decimals, and Heat Transfer';
    let prompt = '';

    if (activeTask === 'homework') {
      prompt = `I am a student in ${activeGradeObj.label}. Please help me solve this step-by-step with clear explanations of each step, the formula used, and a practice tip:\n\n"${topic}"`;
    } else if (activeTask === 'quiz') {
      prompt = `Create an interactive 4-question multiple-choice quiz for ${activeGradeObj.label} on the topic:\n\n"${topic}". Include 4 options (A, B, C, D) for each question, provide an answer key at the end with explanations.`;
    } else if (activeTask === 'flashcards') {
      prompt = `Generate a set of 5 high-yield study flashcards suitable for ${activeGradeObj.label} on:\n\n"${topic}". Format each with a "Question" and clear "Answer".`;
    } else {
      prompt = `Please provide a clear, concise, age-appropriate concept summary with key definitions and bullet points for ${activeGradeObj.label} on:\n\n"${topic}".`;
    }

    onLaunchStudyChat(prompt, currentGrade);
  };

  const currentCard = SAMPLE_FLASHCARDS[cardIndex];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#EF233C]/20 border border-[#EF233C]/30 text-[#EF233C]">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Intelicat <span className="text-[#FF2A3A]">Study & Tutoring Hub</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400">
            Step-by-step homework breakdowns, interactive quizzes, flashcards, and concept simplifiers.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF233C]/10 border border-[#EF233C]/30 text-xs text-[#EF233C] font-bold">
          <Award className="w-3.5 h-3.5" />
          <span>Active Grade: {activeGradeObj.label}</span>
        </div>
      </div>

      {/* Grade Selector Strip */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
          Select Student Grade / Level
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {GRADE_OPTIONS.map((g) => {
            const isSelected = currentGrade === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onSelectGrade(g.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#EF233C] border-[#EF233C] text-white shadow-[0_0_15px_rgba(239,35,60,0.4)]'
                    : g.isHighlight
                    ? 'bg-red-950/30 border-red-500/40 text-neutral-200 hover:border-red-500/80 hover:bg-red-950/50'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-bold">{g.label}</div>
                <div className="text-[10px] text-neutral-300 line-clamp-1 opacity-80">{g.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Study Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task Launcher */}
        <div className="lg:col-span-6 space-y-4 bg-black/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-2">
              Choose Study Task
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTask('homework')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  activeTask === 'homework'
                    ? 'bg-[#EF233C]/20 border-[#EF233C] text-white'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#EF233C] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Homework Solver</div>
                  <div className="text-[10px] text-neutral-400">Step-by-step breakdown & working</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTask('quiz')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  activeTask === 'quiz'
                    ? 'bg-[#EF233C]/20 border-[#EF233C] text-white'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-[#EF233C] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Quiz Generator</div>
                  <div className="text-[10px] text-neutral-400">Multiple-choice with explanations</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTask('flashcards')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  activeTask === 'flashcards'
                    ? 'bg-[#EF233C]/20 border-[#EF233C] text-white'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-[#EF233C] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Flashcard Deck</div>
                  <div className="text-[10px] text-neutral-400">High-yield Q&A study cards</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTask('summary')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  activeTask === 'summary'
                    ? 'bg-[#EF233C]/20 border-[#EF233C] text-white'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-[#EF233C] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Concept Summary</div>
                  <div className="text-[10px] text-neutral-400">Simple bullet points & key formulas</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1.5">
              Topic, Chapter, or Problem
            </label>
            <textarea
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="E.g. Solve: If 3x + 7 = 28, find x. Or: Explain Photosynthesis in plants with equation..."
              rows={3}
              className="w-full rounded-xl bg-neutral-900/90 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EF233C] transition-all resize-none"
            />
          </div>

          <button
            onClick={handleLaunch}
            className="w-full py-3 rounded-xl bg-[#EF233C] hover:bg-[#d90429] text-white font-bold text-sm shadow-[0_0_20px_rgba(239,35,60,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Tutor Session in {activeGradeObj.label}</span>
          </button>
        </div>

        {/* Right Column: Interactive Flashcard Practice */}
        <div className="lg:col-span-6 space-y-4 bg-black/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
              <Layers className="w-4 h-4 text-[#EF233C]" />
              <span>Interactive Study Cards</span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Card {cardIndex + 1} of {SAMPLE_FLASHCARDS.length}
            </span>
          </div>

          {/* Flip Flashcard */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[220px] rounded-2xl p-6 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border-2 border-white/15 hover:border-[#EF233C]/60 transition-all cursor-pointer flex flex-col justify-between shadow-2xl relative select-none group"
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-neutral-300 font-mono">
                {currentCard.topic}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#EF233C] font-semibold group-hover:underline">
                <RotateCw className="w-3 h-3" />
                <span>Click to {isFlipped ? 'Show Question' : 'Reveal Answer'}</span>
              </span>
            </div>

            <div className="py-4 text-center">
              {!isFlipped ? (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                    Question
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                    {currentCard.question}
                  </h4>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                    Answer & Explanation
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                    {currentCard.answer}
                  </p>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-neutral-500">
              {currentCard.grade} Curriculum Card
            </div>
          </div>

          {/* Flashcard Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => (prev > 0 ? prev - 1 : SAMPLE_FLASHCARDS.length - 1));
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Previous Card
            </button>

            <button
              onClick={() => {
                setIsFlipped(false);
                setCardIndex((prev) => (prev < SAMPLE_FLASHCARDS.length - 1 ? prev + 1 : 0));
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Next Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
