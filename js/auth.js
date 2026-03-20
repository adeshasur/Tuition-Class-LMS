import { supabase, TABLES } from './supabase.js';

const AUTH_USER_KEY = 'tuition_user';
const DARK_MODE_KEY = 'tuition_dark_mode';

export async function login(mobile, pin) {
    const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('mobile', mobile)
        .eq('pin', pin)
        .single();

    if (error || !data) {
        return { success: false, error: 'Invalid mobile number or PIN' };
    }

    if (data.status === 'inactive') {
        return { success: false, error: 'Your account is inactive. Please contact administrator.' };
    }

    let settings = await supabase.from(TABLES.USER_SETTINGS).select('*').eq('user_id', data.id).single();
    
    if (!settings.data) {
        await supabase.from(TABLES.USER_SETTINGS).insert({ user_id: data.id, dark_mode: false });
        settings.data = { dark_mode: false };
    }
    
    applyDarkMode(settings.data.dark_mode);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data));
    return { success: true, user: data };
}

export function logout() {
    localStorage.removeItem(AUTH_USER_KEY);
    window.location.href = 'index.html';
}

export function getCurrentUser() {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

export function isLoggedIn() {
    return getCurrentUser() !== null;
}

export function isAdmin() {
    const user = getCurrentUser();
    return user && user.is_admin === true;
}

export function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export function requireAdmin() {
    if (!isAdmin()) {
        window.location.href = 'student.html';
        return false;
    }
    return true;
}

export function toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    applyDarkMode(!isDark);
    saveDarkModePreference(!isDark);
}

export function applyDarkMode(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function saveDarkModePreference(isDark) {
    const user = getCurrentUser();
    if (user) {
        supabase.from(TABLES.USER_SETTINGS).upsert({
            user_id: user.id,
            dark_mode: isDark
        }, { onConflict: 'user_id' });
    }
    localStorage.setItem(DARK_MODE_KEY, isDark);
}

export function loadDarkModePreference() {
    const user = getCurrentUser();
    if (user) {
        supabase.from(TABLES.USER_SETTINGS).select('dark_mode').eq('user_id', user.id).single()
            .then(({ data }) => {
                if (data) {
                    applyDarkMode(data.dark_mode);
                }
            });
    } else {
        const stored = localStorage.getItem(DARK_MODE_KEY);
        if (stored !== null) {
            applyDarkMode(stored === 'true');
        }
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const colors = {
        success: 'bg-white text-black',
        error: 'bg-white text-black',
        warning: 'bg-white text-black',
        info: 'bg-white text-black'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${colors[type]} px-6 py-4 rounded-xl shadow-soft-lg flex items-center gap-3`;
    toast.innerHTML = `
        <span class="font-medium">${message}</span>
        <button onclick="this.parentElement.remove()" class="opacity-50 hover:opacity-100">×</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('sidebar-closed');
    overlay.classList.toggle('hidden');
};

export function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${section}`)?.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
    
    const titles = {
        overview: 'Dashboard Overview',
        users: 'Students',
        materials: 'Materials',
        schedule: 'Schedule',
        announcements: 'Announcements',
        payments: 'Payments',
        attendance: 'Attendance',
        dashboard: 'Dashboard',
        settings: 'Settings'
    };
    
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';
    
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.add('sidebar-closed');
        overlay.classList.add('hidden');
    }
}

window.toggleDarkMode = toggleDarkMode;
window.logout = logout;
window.showSection = showSection;
