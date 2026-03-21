import { supabase, STORAGE_BUCKETS, TABLES, DAYS } from './supabase.js';
import { getCurrentUser, logout, loadDarkModePreference, showToast, showSection, requireAdmin } from './auth.js';

let stats = { students: 0, active: 0, pending: 0, materials: 0 };

async function init() {
    if (!requireAdmin()) return;

    const user = getCurrentUser();
    document.getElementById('admin-name').textContent = user.name;

    loadDarkModePreference();
    setupEventListeners();
    
    await Promise.all([
        loadStats(),
        loadUsers(),
        loadMaterials(),
        loadSchedules(),
        loadAnnouncements(),
        loadPayments(),
        loadAttendance(),
        loadQuizzes()
    ]);


    const attendanceDate = document.getElementById('attendance-date');
    if (attendanceDate) {
        attendanceDate.value = new Date().toISOString().split('T')[0];
    }

    showSection('overview');
}


function setupEventListeners() {
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
    document.getElementById('add-material-form').addEventListener('submit', handleAddMaterial);
    document.getElementById('add-schedule-form').addEventListener('submit', handleAddSchedule);
    document.getElementById('add-announcement-form').addEventListener('submit', handleAddAnnouncement);
    document.getElementById('mark-attendance-form').addEventListener('submit', handleMarkAttendance);
    document.getElementById('add-quiz-form').addEventListener('submit', handleAddQuiz);
    document.getElementById('add-question-form').addEventListener('submit', handleAddQuestion);

    
    document.getElementById('material-type').addEventListener('change', (e) => {
        const urlGroup = document.getElementById('url-input-group');
        const fileGroup = document.getElementById('file-input-group');
        
        if (e.target.value === 'link') {
            urlGroup.classList.remove('hidden');
            fileGroup.classList.add('hidden');
        } else {
            urlGroup.classList.add('hidden');
            fileGroup.classList.remove('hidden');
        }
    });
}

async function loadStats() {
    const { data: users } = await supabase.from(TABLES.USERS).select('*').eq('is_admin', false);
    const { data: payments } = await supabase.from(TABLES.PAYMENTS).select('*').eq('status', 'pending');
    const { data: materials } = await supabase.from(TABLES.MATERIALS).select('id');

    stats.students = users?.length || 0;
    stats.active = users?.filter(u => u.status === 'active').length || 0;
    stats.pending = payments?.length || 0;
    stats.materials = materials?.length || 0;

    document.getElementById('stat-students').textContent = stats.students;
    document.getElementById('stat-active').textContent = stats.active;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-materials').textContent = stats.materials;

    if (stats.pending > 0) {
        const badge = document.getElementById('pending-payments-badge');
        badge.classList.remove('hidden');
        badge.textContent = stats.pending;
    }
}

async function loadUsers() {
    const { data: users } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });

    const tbody = document.querySelector('#users-table');
    tbody.innerHTML = users?.map(user => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="font-medium text-white">${user.name}</span>
                </div>
            </td>
            <td class="py-4 px-4 text-white/60">${user.mobile}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-white text-black' : 'bg-white/10 text-white/60'}">
                    ${user.status}
                </span>
            </td>
            <td class="py-4 px-4">
                <button onclick="toggleUserStatus('${user.id}', '${user.status}')" class="text-white/60 hover:text-white font-medium transition">${user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                <span class="mx-2 text-white/20">|</span>
                <button onclick="deleteUser('${user.id}')" class="text-white/40 hover:text-red-400 font-medium transition">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="py-8 text-center text-white/40">No students found</td></tr>';

    const studentSelect = document.getElementById('attendance-student');
    if (studentSelect) {
        studentSelect.innerHTML = users?.map(u => `<option value="${u.id}" class="bg-black">${u.name}</option>`).join('') || '';
    }
}

window.toggleUserStatus = async function(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from(TABLES.USERS).update({ status: newStatus }).eq('id', id);
    showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    loadUsers();
    loadStats();
};

window.deleteUser = async function(id) {
    if (confirm('Delete this user?')) {
        await supabase.from(TABLES.USERS).delete().eq('id', id);
        showToast('User deleted', 'success');
        loadUsers();
        loadStats();
    }
};

async function handleAddUser(e) {
    e.preventDefault();
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const pin = document.getElementById('new-pin').value;

    const { error } = await supabase.from(TABLES.USERS).insert({
        name, mobile, pin, status: 'inactive', is_admin: false
    });

    if (error) {
        showToast('Error: ' + error.message, 'error');
    } else {
        document.getElementById('add-user-form').reset();
        showToast('Student added!', 'success');
        loadUsers();
        loadStats();
    }
}

async function loadMaterials() {
    const { data: materials } = await supabase
        .from(TABLES.MATERIALS)
        .select('*')
        .order('created_at', { ascending: false });

    const tbody = document.querySelector('#materials-table');
    tbody.innerHTML = materials?.map(mat => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-4 px-4 font-medium text-white">${mat.title}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${mat.type === 'link' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}">
                    ${mat.type}
                </span>
            </td>
            <td class="py-4 px-4">
                <button onclick="deleteMaterial('${mat.id}')" class="text-white/40 hover:text-red-400 font-medium transition">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="py-8 text-center text-white/40">No materials found</td></tr>';
}

window.deleteMaterial = async function(id) {
    if (confirm('Delete this material?')) {
        await supabase.from(TABLES.MATERIALS).delete().eq('id', id);
        showToast('Material deleted', 'success');
        loadMaterials();
        loadStats();
    }
};

async function handleAddMaterial(e) {
    e.preventDefault();
    const title = document.getElementById('material-title').value;
    const type = document.getElementById('material-type').value;
    const urlInput = document.getElementById('material-url');
    const fileInput = document.getElementById('material-file');
    
    let url = urlInput.value;

    if (type === 'pdf' && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKETS.TUTES).upload(fileName, file);

        if (!error) {
            const { data } = supabase.storage.from(STORAGE_BUCKETS.TUTES).getPublicUrl(fileName);
            url = data.publicUrl;
        }
    }

    if (!url) {
        showToast('Please provide URL or upload file', 'error');
        return;
    }

    const { error } = await supabase.from(TABLES.MATERIALS).insert({ title, type, url });

    if (!error) {
        document.getElementById('add-material-form').reset();
        document.getElementById('url-input-group').classList.remove('hidden');
        document.getElementById('file-input-group').classList.add('hidden');
        showToast('Material added!', 'success');
        loadMaterials();
        loadStats();
    }
}

async function loadSchedules() {
    const { data: schedules } = await supabase
        .from(TABLES.SCHEDULES)
        .select('*')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

    const container = document.getElementById('schedule-list');
    container.innerHTML = schedules?.map(s => `
        <div class="p-5 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-white">${s.title}</h4>
                <span class="text-sm text-white/50">${DAYS[s.day_of_week]}</span>
            </div>
            <p class="text-white/60">${s.start_time} - ${s.end_time}</p>
            <div class="mt-3 flex gap-3">
                ${s.meeting_link ? `<a href="${s.meeting_link}" target="_blank" class="text-sm text-white/60 hover:text-white transition">Join Link</a>` : ''}
                <button onclick="deleteSchedule('${s.id}')" class="text-sm text-white/40 hover:text-red-400 transition">Delete</button>
            </div>
        </div>
    `).join('') || '<p class="text-white/40">No schedules</p>';
}

window.deleteSchedule = async function(id) {
    if (confirm('Delete this schedule?')) {
        await supabase.from(TABLES.SCHEDULES).update({ is_active: false }).eq('id', id);
        showToast('Schedule deleted', 'success');
        loadSchedules();
    }
};

async function handleAddSchedule(e) {
    e.preventDefault();
    const title = document.getElementById('schedule-title').value;
    const day = parseInt(document.getElementById('schedule-day').value);
    const start = document.getElementById('schedule-start').value;
    const end = document.getElementById('schedule-end').value;

    const { error } = await supabase.from(TABLES.SCHEDULES).insert({
        title, day_of_week: day, start_time: start, end_time: end
    });

    if (!error) {
        document.getElementById('add-schedule-form').reset();
        showToast('Schedule added!', 'success');
        loadSchedules();
    }
}

async function loadAnnouncements() {
    const { data: announcements } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select('*, users(name)')
        .order('created_at', { ascending: false });

    const container = document.getElementById('announcements-table');
    container.innerHTML = announcements?.map(a => `
        <div class="p-5 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-white">${a.title}</h4>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${a.is_active ? 'bg-white text-black' : 'bg-white/10 text-white/60'}">
                    ${a.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <p class="text-white/60">${a.content}</p>
            <div class="mt-4 flex items-center justify-between">
                <span class="text-sm text-white/40">${new Date(a.created_at).toLocaleDateString()}</span>
                <button onclick="toggleAnnouncement('${a.id}', ${!a.is_active})" class="text-sm text-white/60 hover:text-white transition">
                    ${a.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        </div>
    `).join('') || '<p class="text-white/40">No announcements</p>';
}

window.toggleAnnouncement = async function(id, isActive) {
    await supabase.from(TABLES.ANNOUNCEMENTS).update({ is_active: isActive }).eq('id', id);
    showToast('Announcement updated', 'success');
    loadAnnouncements();
};

async function handleAddAnnouncement(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    const priority = document.getElementById('announcement-priority').value;

    const { error } = await supabase.from(TABLES.ANNOUNCEMENTS).insert({
        title, content, priority, created_by: user.id
    });

    if (!error) {
        document.getElementById('add-announcement-form').reset();
        showToast('Announcement published!', 'success');
        loadAnnouncements();
    }
}

async function loadPayments() {
    const { data: payments } = await supabase
        .from(TABLES.PAYMENTS)
        .select('*, users(name, mobile)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    const container = document.getElementById('payments-list');
    container.innerHTML = payments?.length ? payments.map(p => `
        <div class="flex items-start gap-5 p-5 rounded-xl bg-white/5 border border-white/5">
            <div class="flex-1">
                <h4 class="font-semibold text-white">${p.users?.name || 'Unknown'}</h4>
                <p class="text-sm text-white/50">${p.users?.mobile || 'N/A'}</p>
                <p class="text-sm text-white/40 mt-1">${new Date(p.created_at).toLocaleString()}</p>
            </div>
            <div class="flex gap-2">
                <a href="${p.slip_url}" target="_blank" class="px-4 py-2 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition">View</a>
                <button onclick="approvePayment('${p.id}', '${p.student_id}')" class="px-4 py-2 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition">Approve</button>
                <button onclick="rejectPayment('${p.id}')" class="px-4 py-2 bg-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/20 transition">Reject</button>
            </div>
        </div>
    `).join('') : '<p class="text-white/40 text-center py-12">No pending payments</p>';
}

window.approvePayment = async function(paymentId, studentId) {
    await supabase.from(TABLES.PAYMENTS).update({ status: 'approved' }).eq('id', paymentId);
    await supabase.from(TABLES.USERS).update({ status: 'active' }).eq('id', studentId);
    
    await supabase.from(TABLES.NOTIFICATIONS).insert({
        user_id: studentId,
        title: 'Payment Approved!',
        message: 'Your payment has been verified.',
        type: 'success'
    });

    showToast('Payment approved!', 'success');
    loadPayments();
    loadUsers();
    loadStats();
};

window.rejectPayment = async function(paymentId) {
    await supabase.from(TABLES.PAYMENTS).update({ status: 'rejected' }).eq('id', paymentId);
    showToast('Payment rejected', 'success');
    loadPayments();
    loadStats();
};

async function loadAttendance() {
    const { data: attendance } = await supabase
        .from(TABLES.ATTENDANCE)
        .select('*, users(name), schedules(title)')
        .order('date', { ascending: false })
        .limit(50);

    const tbody = document.getElementById('attendance-table');
    tbody.innerHTML = attendance?.map(a => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-4 px-4 text-white">${a.users?.name || 'Unknown'}</td>
            <td class="py-4 px-4 text-white/60">${new Date(a.date).toLocaleDateString()}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${a.status === 'present' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}">${a.status}</span>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="py-8 text-center text-white/40">No records</td></tr>';
}

async function handleMarkAttendance(e) {
    e.preventDefault();
    const studentId = document.getElementById('attendance-student').value;
    const date = document.getElementById('attendance-date').value;
    const status = document.getElementById('attendance-status').value;

    const { error } = await supabase.from(TABLES.ATTENDANCE).upsert({
        student_id: studentId,
        date,
        status,
        marked_by: getCurrentUser().id
    }, { onConflict: 'student_id,date' });

    if (!error) {
        showToast('Attendance marked!', 'success');
        loadAttendance();
    }
}

async function loadQuizzes() {
    const { data: quizzes } = await supabase
        .from(TABLES.QUIZZES)
        .select('*, quiz_questions(count)')
        .order('created_at', { ascending: false });

    const tbody = document.querySelector('#quizzes-table');
    tbody.innerHTML = quizzes?.map(q => `
        <tr class="hover:bg-white/5 transition">
            <td class="py-4 px-4 font-medium text-white">${q.title}</td>
            <td class="py-4 px-4 text-white/60">${q.quiz_questions?.[0]?.count || 0} Questions</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${q.is_active ? 'bg-white text-black' : 'bg-white/10 text-white/60'}">
                    ${q.is_active ? 'Active' : 'Draft'}
                </span>
            </td>
            <td class="py-4 px-4">
                <button onclick="showQuestionEditor('${q.id}', '${q.title}')" class="text-white hover:underline font-medium transition">Edit Qs</button>
                <span class="mx-2 text-white/20">|</span>
                <button onclick="toggleQuizStatus('${q.id}', ${q.is_active})" class="text-white/60 hover:text-white transition">${q.is_active ? 'Draft' : 'Publish'}</button>
                <span class="mx-2 text-white/20">|</span>
                <button onclick="deleteQuiz('${q.id}')" class="text-white/40 hover:text-red-400 transition">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="py-8 text-center text-white/40">No quizzes found</td></tr>';
}

async function handleAddQuiz(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const title = document.getElementById('quiz-title').value;
    const description = document.getElementById('quiz-description').value;
    const duration = parseInt(document.getElementById('quiz-duration').value);
    const passing = parseInt(document.getElementById('quiz-passing').value);

    const { error } = await supabase.from(TABLES.QUIZZES).insert({
        title, description, duration_minutes: duration, passing_score: passing, 
        is_active: false, created_by: user.id
    });

    if (!error) {
        document.getElementById('add-quiz-form').reset();
        showToast('Quiz created! Now add some questions.', 'success');
        loadQuizzes();
    }
}

window.toggleQuizStatus = async function(id, currentStatus) {
    await supabase.from(TABLES.QUIZZES).update({ is_active: !currentStatus }).eq('id', id);
    showToast(`Quiz ${!currentStatus ? 'published' : 'moved to draft'}`, 'success');
    loadQuizzes();
};

window.deleteQuiz = async function(id) {
    if (confirm('Delete this quiz and all its questions?')) {
        await supabase.from(TABLES.QUIZZES).delete().eq('id', id);
        showToast('Quiz deleted', 'success');
        loadQuizzes();
    }
};

window.showQuestionEditor = async function(id, title) {
    document.getElementById('current-quiz-id').value = id;
    document.getElementById('current-quiz-title').textContent = title;
    document.getElementById('quiz-question-editor').classList.remove('hidden');
    document.getElementById('quiz-question-editor').scrollIntoView({ behavior: 'smooth' });
    loadQuestions(id);
};

window.hideQuestionEditor = function() {
    document.getElementById('quiz-question-editor').classList.add('hidden');
};

async function loadQuestions(quizId) {
    const { data: questions } = await supabase
        .from(TABLES.QUIZ_QUESTIONS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

    const container = document.getElementById('questions-list');
    container.innerHTML = questions?.map((q, idx) => `
        <div class="p-5 rounded-xl bg-black/40 border border-white/5">
            <div class="flex items-start justify-between gap-4 mb-4">
                <div class="flex gap-4">
                    <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white">${idx + 1}</span>
                    <p class="text-white font-medium">${q.question}</p>
                </div>
                <button onclick="deleteQuestion('${q.id}', '${quizId}')" class="text-white/30 hover:text-red-400 transition">✕</button>
            </div>
            <div class="grid grid-cols-2 gap-3 pl-12">
                ${q.options.map((opt, i) => `
                    <div class="text-sm ${i === q.correct_answer - 1 ? 'text-green-400 font-bold' : 'text-white/40'}">
                        ${i + 1}. ${opt}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('') || '<p class="text-white/30 text-center py-4">No questions added yet.</p>';
}

async function handleAddQuestion(e) {
    e.preventDefault();
    const quiz_id = document.getElementById('current-quiz-id').value;
    const question = document.getElementById('question-text').value;
    const correct_answer = parseInt(document.getElementById('correct-opt').value);
    const options = Array.from(document.querySelectorAll('.quiz-opt')).map(opt => opt.value);

    const { data: currentQs } = await supabase.from(TABLES.QUIZ_QUESTIONS).select('id').eq('quiz_id', quiz_id);
    const order_index = (currentQs?.length || 0) + 1;

    const { error } = await supabase.from(TABLES.QUIZ_QUESTIONS).insert({
        quiz_id, question, options, correct_answer, order_index, points: 10
    });

    if (!error) {
        document.getElementById('add-question-form').reset();
        showToast('Question added!', 'success');
        loadQuestions(quiz_id);
        loadQuizzes();
    }
}

window.deleteQuestion = async function(id, quizId) {
    await supabase.from(TABLES.QUIZ_QUESTIONS).delete().eq('id', id);
    showToast('Question removed', 'success');
    loadQuestions(quizId);
    loadQuizzes();
};

window.toggleDarkMode = function() {

    import('./auth.js').then(m => m.toggleDarkMode());
};

init();
