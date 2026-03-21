import { supabase, TABLES } from './supabase.js';
import { getCurrentUser } from './auth.js';

let currentQuiz = null;
let currentAttempt = null;
let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let timer = null;

export async function loadQuizzes() {
    const container = document.getElementById('quizzes-container');
    if (!container) return;

    const { data: quizzes, error } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error || !quizzes?.length) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Quizzes Available</h3>
                <p class="text-gray-500 dark:text-gray-400">Check back later for new quizzes.</p>
            </div>
        `;
        return;
    }

    const user = getCurrentUser();
    const { data: attempts } = await supabase
        .from(TABLES.QUIZ_ATTEMPTS)
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'completed');

    container.innerHTML = quizzes.map(quiz => {
        const userAttempts = attempts?.filter(a => a.quiz_id === quiz.id) || [];
        const bestScore = userAttempts.length > 0 ? Math.max(...userAttempts.map(a => a.score)) : null;
        const passed = bestScore !== null && bestScore >= quiz.passing_score;
        
        return `
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                        </svg>
                    </div>
                    ${passed ? '<span class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">Passed</span>' : ''}
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${quiz.title}</h3>
                <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">${quiz.description || 'Test your knowledge'}</p>
                <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        ${quiz.duration_minutes} min
                    </span>
                    <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Pass: ${quiz.passing_score}%
                    </span>
                </div>
                ${bestScore !== null ? `<p class="text-sm text-gray-500 mb-4">Best Score: <span class="font-semibold">${bestScore}%</span></p>` : ''}
                <button onclick="startQuiz('${quiz.id}')" class="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:opacity-90 transition">
                    ${userAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
                </button>
            </div>
        `;
    }).join('');
}

export async function startQuiz(quizId) {
    const user = getCurrentUser();
    
    const { data: quiz } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('id', quizId)
        .single();
    
    const { data: quizQuestions } = await supabase
        .from(TABLES.QUIZ_QUESTIONS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

    if (!quiz || !quizQuestions?.length) {
        alert('Quiz not found or has no questions');
        return;
    }

    const { data: attempt, error } = await supabase
        .from(TABLES.QUIZ_ATTEMPTS)
        .insert({
            quiz_id: quizId,
            student_id: user.id,
            status: 'in_progress',
            total_points: quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
        })
        .select()
        .single();

    if (error) {
        alert('Error starting quiz');
        return;
    }

    currentQuiz = quiz;
    currentAttempt = attempt;
    questions = quizQuestions;
    currentQuestionIndex = 0;
    answers = {};

    showQuizModal(quiz, quizQuestions);
    startTimer(quiz.duration_minutes);
}

function showQuizModal(quiz, questions) {
    const modal = document.getElementById('quiz-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    renderQuestion(questions[0], 0);
}

function renderQuestion(question, index) {
    const container = document.getElementById('quiz-content');
    const options = question.options;
    
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-500">Question ${index + 1} of ${questions.length}</span>
                <span id="quiz-timer" class="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg text-sm font-mono font-semibold">--:--</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div class="bg-black dark:bg-white h-1 rounded-full transition-all" style="width: ${((index + 1) / questions.length) * 100}%"></div>
            </div>
        </div>
        
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">${question.question}</h3>
        
        <div class="space-y-3">
            ${options.map((option, i) => `
                <button onclick="selectAnswer(${index}, ${i})" 
                        class="answer-option w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-white transition group ${answers[index] === i ? 'border-black dark:border-white bg-black/5 dark:bg-white/5' : ''}">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-semibold mr-3 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition">${String.fromCharCode(65 + i)}</span>
                    <span class="text-gray-900 dark:text-white">${option}</span>
                </button>
            `).join('')}
        </div>
        
        <div class="flex items-center justify-between mt-8">
            <button onclick="prevQuestion()" class="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${index === 0 ? 'disabled' : ''}>
                Previous
            </button>
            ${index < questions.length - 1 ? `
                <button onclick="nextQuestion()" class="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:opacity-90 transition">
                    Next
                </button>
            ` : `
                <button onclick="submitQuiz()" class="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:opacity-90 transition">
                    Submit Quiz
                </button>
            `}
        </div>
    `;
}

window.selectAnswer = function(questionIndex, answerIndex) {
    answers[questionIndex] = answerIndex;
    const question = questions[questionIndex];
    renderQuestion(question, questionIndex);
};

window.nextQuestion = function() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(questions[currentQuestionIndex], currentQuestionIndex);
    }
};

window.prevQuestion = function() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion(questions[currentQuestionIndex], currentQuestionIndex);
    }
};

function startTimer(minutes) {
    let seconds = minutes * 60;
    
    timer = setInterval(() => {
        seconds--;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timerEl = document.getElementById('quiz-timer');
        if (timerEl) {
            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        
        if (seconds <= 0) {
            clearInterval(timer);
            submitQuiz();
        }
    }, 1000);
}

window.submitQuiz = async function() {
    clearInterval(timer);
    
    let score = 0;
    questions.forEach((q, i) => {
        if (answers[i] === q.correct_answer) {
            score += q.points || 1;
        }
    });
    
    const percentage = Math.round((score / currentAttempt.total_points) * 100);
    const passed = percentage >= currentQuiz.passing_score;
    
    await supabase
        .from(TABLES.QUIZ_ATTEMPTS)
        .update({
            answers: answers,
            score: percentage,
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', currentAttempt.id);

    showResults(percentage, passed);
};

function showResults(score, passed) {
    const modal = document.getElementById('quiz-modal');
    const content = document.getElementById('quiz-content');
    
    content.innerHTML = `
        <div class="text-center py-8">
            <div class="w-24 h-24 mx-auto mb-6 rounded-full ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center">
                ${passed ? `
                    <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                ` : `
                    <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                `}
            </div>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">${passed ? 'Congratulations!' : 'Keep Trying!'}</h2>
            <p class="text-gray-500 dark:text-gray-400 mb-6">You scored <span class="font-bold text-4xl text-gray-900 dark:text-white">${score}%</span></p>
            <p class="text-sm text-gray-500 mb-8">Passing score: ${currentQuiz.passing_score}%</p>
            <div class="flex gap-4 justify-center">
                <button onclick="closeQuizModal(); loadQuizzes();" class="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold">
                    Back to Quizzes
                </button>
                ${!passed ? `
                    <button onclick="startQuiz('${currentQuiz.id}')" class="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        Try Again
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

window.closeQuizModal = function() {
    const modal = document.getElementById('quiz-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentQuiz = null;
    currentAttempt = null;
    questions = [];
    currentQuestionIndex = 0;
    answers = {};
};
window.startQuiz = startQuiz;
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.submitQuiz = submitQuiz;
window.closeQuizModal = closeQuizModal;
