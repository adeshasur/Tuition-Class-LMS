import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://hbwsbxrjhhjsfahpjzib.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid3NieHJqaGhqc2ZhaHBqemliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTEyOTcsImV4cCI6MjA4OTU4NzI5N30.AHuL-rUEGAjcIU3ELvkIM3zh75zHL7nBGZIvjmZFDhk';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const STORAGE_BUCKETS = {
    PAYMENT_SLIPS: 'payment-slips',
    TUTES: 'tutes'
};

export const TABLES = {
    USERS: 'users',
    MATERIALS: 'materials',
    PAYMENTS: 'payments',
    ANNOUNCEMENTS: 'announcements',
    SCHEDULES: 'schedules',
    ATTENDANCE: 'attendance',
    NOTIFICATIONS: 'notifications',
    USER_SETTINGS: 'user_settings',
    QUIZZES: 'quizzes',
    QUIZ_QUESTIONS: 'quiz_questions',
    QUIZ_ATTEMPTS: 'quiz_attempts',
    ACHIEVEMENTS: 'achievements',
    USER_ACHIEVEMENTS: 'user_achievements',
    FORUM_CATEGORIES: 'forum_categories',
    FORUM_POSTS: 'forum_posts',
    FORUM_REPLIES: 'forum_replies',
    CERTIFICATES: 'certificates',
    ACTIVITY_LOG: 'activity_log'
};

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const ATTENDANCE_STATUS = { PRESENT: 'present', ABSENT: 'absent', LATE: 'late', EXCUSED: 'excused' };
export const PRIORITIES = { LOW: 'low', NORMAL: 'normal', HIGH: 'high', URGENT: 'urgent' };
