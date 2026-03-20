import { supabase, STORAGE_BUCKETS, TABLES, DAYS, ATTENDANCE_STATUS } from './supabase.js';
import { getCurrentUser, logout, loadDarkModePreference, showToast, showSection } from './auth.js';
import { loadQuizzes } from './quiz.js';

let notifications = [];

async function init() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-name-header').textContent = user.name;
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-mobile').textContent = user.mobile;
    document.getElementById('avatar-initial').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('settings-name').value = user.name;
    document.getElementById('settings-mobile').value = user.mobile;

    loadDarkModePreference();
    setupEventListeners();
    
    await Promise.all([
        loadStats(),
        loadAnnouncements(),
        loadMaterials(),
        loadSchedule(),
        loadAttendance(),
        loadPaymentStatus(),
        loadNotifications()
    ]);

    showSection('dashboard');
}

function setupEventListeners() {
    document.getElementById('upload-form').addEventListener('submit', handlePaymentUpload);
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    
    const originalShowSection = window.showSection;
    window.showSection = function(section) {
        originalShowSection(section);
        if (section === 'quizzes') {
            loadQuizzes();
        }
    };
}

async function loadStats() {
    const user = getCurrentUser();
    
    const today = new Date().getDay();
    const { data: todayClasses } = await supabase.from(TABLES.SCHEDULES).select('*').eq('day_of_week', today).eq('is_active', true);
    document.getElementById('classes-today').textContent = todayClasses?.length || 0;

    const { data: materials } = await supabase.from(TABLES.MATERIALS).select('id');
    document.getElementById('materials-count').textContent = materials?.length || 0;

    const { data: attendance } = await supabase.from(TABLES.ATTENDANCE).select('*').eq('student_id', user.id);
    if (attendance && attendance.length > 0) {
        const present = attendance.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length;
        const rate = Math.round((present / attendance.length) * 100);
        document.getElementById('attendance-rate').textContent = `${rate}%`;
    }
}

async function loadAnnouncements() {
    const { data: announcements } = await supabase
        .from(TABLES.ANNOUNCEMENTS)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const container = document.getElementById('announcements-list');
    if (!announcements || announcements.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">No announcements</p>';
        return;
    }

    container.innerHTML = announcements.map(a => `
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div class="flex items-start justify-between gap-3">
                <h4 class="font-semibold text-gray-900 dark:text-white">${a.title}</h4>
                <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-black dark:bg-white text-white dark:text-black">${a.priority}</span>
            </div>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${a.content}</p>
            <p class="mt-3 text-xs text-gray-400">${new Date(a.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
}

async function loadMaterials() {
    const { data: materials } = await supabase
        .from(TABLES.MATERIALS)
        .select('*')
        .order('created_at', { ascending: false });

    const links = materials?.filter(m => m.type === 'link') || [];
    const pdfs = materials?.filter(m => m.type === 'pdf') || [];

    document.getElementById('materials-links').innerHTML = links.length ? links.map(link => `
        <a href="${link.url}" target="_blank" class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition group">
            <div class="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white transition">${link.title}</p>
                <p class="text-sm text-gray-500">Click to join</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"/></svg>
        </a>
    `).join('') : '<p class="text-gray-500 dark:text-gray-400 text-sm">No class links available</p>';

    document.getElementById('materials-pdfs').innerHTML = pdfs.length ? pdfs.map(pdf => `
        <a href="${pdf.url}" target="_blank" download class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition group">
            <div class="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white transition">${pdf.title}</p>
                <p class="text-sm text-gray-500">Download PDF</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </a>
    `).join('') : '<p class="text-gray-500 dark:text-gray-400 text-sm">No study materials available</p>';
}

async function loadSchedule() {
    const { data: schedules } = await supabase
        .from(TABLES.SCHEDULES)
        .select('*')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

    const upcomingContainer = document.getElementById('upcoming-classes');
    const today = new Date().getDay();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todaySchedules = schedules?.filter(s => s.day_of_week === today) || [];
    const upcoming = todaySchedules.filter(s => {
        const [h, m] = s.start_time.split(':').map(Number);
        return h * 60 + m > currentTime;
    });

    upcomingContainer.innerHTML = upcoming.length ? upcoming.map(s => `
        <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div>
                <p class="font-semibold text-gray-900 dark:text-white">${s.title}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${s.start_time} - ${s.end_time}</p>
            </div>
            <a href="${s.meeting_link || '#'}" target="_blank" class="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition">
                Join
            </a>
        </div>
    `).join('') : '<p class="text-gray-500 dark:text-gray-400 text-sm">No more classes today</p>';

    const timetableContainer = document.getElementById('schedule-timetable');
    if (timetableContainer) {
        let timetableHTML = DAYS.map((day, index) => {
            const dayClasses = schedules?.filter(s => s.day_of_week === index) || [];
            const isToday = index === today;
            return `
                <div class="text-center">
                    <h4 class="font-semibold text-sm ${isToday ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'} mb-3">${day.substring(0, 3)}</h4>
                    <div class="space-y-2">
                        ${dayClasses.map(c => `
                            <div class="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
                                <p class="font-semibold text-gray-900 dark:text-white">${c.title}</p>
                                <p class="text-gray-500 dark:text-gray-400">${c.start_time}</p>
                            </div>
                        `).join('') || '<p class="text-gray-300 dark:text-gray-600 text-xs">-</p>'}
                    </div>
                </div>
            `;
        }).join('');
        timetableContainer.innerHTML = timetableHTML;
    }
}

async function loadAttendance() {
    const user = getCurrentUser();
    const { data: attendance } = await supabase
        .from(TABLES.ATTENDANCE)
        .select('*, schedules(title)')
        .eq('student_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

    const container = document.getElementById('attendance-table');
    if (!attendance || attendance.length === 0) {
        container.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-gray-500">No attendance records</td></tr>';
        return;
    }

    container.innerHTML = attendance.map(a => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <td class="py-4 px-4 text-gray-900 dark:text-white">${new Date(a.date).toLocaleDateString()}</td>
            <td class="py-4 px-4 text-gray-600 dark:text-gray-400">${a.schedules?.title || 'N/A'}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${a.status === 'present' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}">${a.status}</span>
            </td>
        </tr>
    `).join('');
}

async function loadPaymentStatus() {
    const user = getCurrentUser();
    const statusEl = document.getElementById('payment-status-badge');
    const historyEl = document.getElementById('payment-history-list');
    
    const { data: payment } = await supabase
        .from(TABLES.PAYMENTS)
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (payment) {
        if (payment.status === 'approved') {
            statusEl.textContent = 'Approved';
            statusEl.className = 'text-lg font-bold text-green-600';
        } else {
            statusEl.textContent = 'Pending';
            statusEl.className = 'text-lg font-bold text-gray-600 dark:text-gray-400';
        }

        const { data: history } = await supabase
            .from(TABLES.PAYMENTS)
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });

        historyEl.innerHTML = history?.map(p => `
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${new Date(p.created_at).toLocaleDateString()}</p>
                    <a href="${p.slip_url}" target="_blank" class="text-sm font-medium text-black dark:text-white hover:underline">View Slip</a>
                </div>
                <span class="px-3 py-1.5 rounded-full text-xs font-semibold ${p.status === 'approved' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}">${p.status}</span>
            </div>
        `).join('') || '';
    } else {
        statusEl.textContent = 'Not Paid';
        statusEl.className = 'text-lg font-bold text-red-600';
    }
}

async function handlePaymentUpload(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const fileInput = document.getElementById('slip-file');
    
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const fileName = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.PAYMENT_SLIPS)
        .upload(fileName, file);

    if (uploadError) {
        showToast('Error uploading file', 'error');
        return;
    }

    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PAYMENT_SLIPS)
        .getPublicUrl(fileName);

    await supabase.from(TABLES.PAYMENTS).insert({
        student_id: user.id,
        slip_url: urlData.publicUrl,
        status: 'pending'
    });

    showToast('Payment slip uploaded successfully!', 'success');
    fileInput.value = '';
    loadPaymentStatus();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const newName = document.getElementById('settings-name').value;

    const { error } = await supabase
        .from(TABLES.USERS)
        .update({ name: newName })
        .eq('id', user.id);

    if (!error) {
        user.name = newName;
        localStorage.setItem('tuition_user', JSON.stringify(user));
        document.getElementById('user-name-header').textContent = newName;
        document.getElementById('profile-name').textContent = newName;
        document.getElementById('avatar-initial').textContent = newName.charAt(0).toUpperCase();
        showToast('Profile updated!', 'success');
    } else {
        showToast('Error updating profile', 'error');
    }
}

async function loadNotifications() {
    const user = getCurrentUser();
    const { data } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    notifications = data || [];
    updateNotificationBadge();
    renderNotifications();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    const unread = notifications.filter(n => !n.is_read).length;
    
    if (unread > 0) {
        badge.classList.remove('hidden');
        badge.textContent = unread;
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotifications() {
    const container = document.getElementById('notification-list');
    
    if (!notifications.length) {
        container.innerHTML = '<p class="p-6 text-center text-gray-500">No notifications</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${!n.is_read ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}" onclick="markNotificationRead('${n.id}')">
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold">N</div>
                <div class="flex-1">
                    <p class="font-medium text-gray-900 dark:text-white">${n.title}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${n.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${new Date(n.created_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    `).join('');
}

window.markNotificationRead = async function(id) {
    await supabase.from(TABLES.NOTIFICATIONS).update({ is_read: true }).eq('id', id);
    const notification = notifications.find(n => n.id === id);
    if (notification) notification.is_read = true;
    updateNotificationBadge();
    renderNotifications();
};

window.toggleNotifications = function() {
    const dropdown = document.getElementById('notification-dropdown');
    const profile = document.getElementById('profile-dropdown');
    profile.classList.add('hidden');
    dropdown.classList.toggle('hidden');
};

window.toggleProfile = function() {
    const dropdown = document.getElementById('profile-dropdown');
    const notifications = document.getElementById('notification-dropdown');
    notifications.classList.add('hidden');
    dropdown.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('[onclick="toggleNotifications()"]') && !e.target.closest('#notification-dropdown')) {
        document.getElementById('notification-dropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('[onclick="toggleProfile()"]') && !e.target.closest('#profile-dropdown')) {
        document.getElementById('profile-dropdown')?.classList.add('hidden');
    }
});

init();
