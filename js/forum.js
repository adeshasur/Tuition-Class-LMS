import { supabase, TABLES } from './supabase.js';
import { getCurrentUser } from './auth.js';

let currentCategory = null;
let currentPost = null;

export async function loadForumCategories() {
    const { data: categories } = await supabase
        .from(TABLES.FORUM_CATEGORIES)
        .select('*')
        .order('created_at');

    return categories || [];
}

export async function loadForumPosts(categoryId = null) {
    let query = supabase
        .from(TABLES.FORUM_POSTS)
        .select(`
            *,
            users(name),
            forum_categories(name),
            forum_replies(count)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data: posts } = await query;
    return posts || [];
}

export async function loadPost(postId) {
    const { data: post } = await supabase
        .from(TABLES.FORUM_POSTS)
        .select(`
            *,
            users(name),
            forum_categories(name)
        `)
        .eq('id', postId)
        .single();

    if (post) {
        await supabase
            .from(TABLES.FORUM_POSTS)
            .update({ views: post.views + 1 })
            .eq('id', postId);
    }

    return post;
}

export async function loadReplies(postId) {
    const { data: replies } = await supabase
        .from(TABLES.FORUM_REPLIES)
        .select(`
            *,
            users(name)
        `)
        .eq('post_id', postId)
        .order('created_at');

    return replies || [];
}

export async function createPost(title, content, categoryId) {
    const user = getCurrentUser();
    
    const { data, error } = await supabase
        .from(TABLES.FORUM_POSTS)
        .insert({
            title,
            content,
            category_id: categoryId,
            user_id: user.id
        })
        .select()
        .single();

    return { data, error };
}

export async function createReply(postId, content) {
    const user = getCurrentUser();
    
    const { data, error } = await supabase
        .from(TABLES.FORUM_REPLIES)
        .insert({
            post_id: postId,
            content,
            user_id: user.id
        })
        .select()
        .single();

    return { data, error };
}

export async function loadCertificates() {
    const user = getCurrentUser();
    
    const { data } = await supabase
        .from(TABLES.CERTIFICATES)
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

    return data || [];
}

export async function generateCertificate(title, description) {
    const user = getCurrentUser();
    const verificationCode = 'CERT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const { data, error } = await supabase
        .from(TABLES.CERTIFICATES)
        .insert({
            user_id: user.id,
            title,
            description,
            verification_code: verificationCode,
            issued_at: new Date().toISOString()
        })
        .select()
        .single();

    return { data, error };
}

export function renderForum(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <div class="flex gap-2" id="forum-categories"></div>
            <button onclick="showNewPostModal()" class="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:opacity-90 transition">
                New Post
            </button>
        </div>
        <div id="forum-posts" class="space-y-4"></div>
    `;

    loadForumCategories().then(categories => {
        const categoriesEl = document.getElementById('forum-categories');
        categoriesEl.innerHTML = `
            <button onclick="filterPosts(null)" class="category-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-black text-white dark:bg-white dark:text-black transition" data-id="">
                All
            </button>
            ${categories.map(c => `
                <button onclick="filterPosts('${c.id}')" class="category-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition" data-id="${c.id}">
                    ${c.name}
                </button>
            `).join('')}
        `;
    });

    loadForumPosts().then(posts => renderPosts(posts));
}

export function renderPosts(posts) {
    const container = document.getElementById('forum-posts');
    if (!container) return;

    if (!posts.length) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Posts Yet</h3>
                <p class="text-gray-500 dark:text-gray-400">Start a discussion to engage with your peers.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => `
        <div onclick="viewPost('${post.id}')" class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition cursor-pointer ${post.is_pinned ? 'ring-2 ring-black dark:ring-white' : ''}">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-sm font-semibold">
                    ${post.users?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        ${post.is_pinned ? '<span class="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded">Pinned</span>' : ''}
                        ${post.forum_categories ? `<span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded">${post.forum_categories.name}</span>` : ''}
                    </div>
                    <h4 class="font-semibold text-gray-900 dark:text-white truncate">${post.title}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">${post.content}</p>
                    <div class="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>${post.users?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>${post.forum_replies?.[0]?.count || 0} replies</span>
                        <span>•</span>
                        <span>${post.views} views</span>
                        <span>•</span>
                        <span>${formatDate(post.created_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

export function renderPost(post, replies) {
    return `
        <div class="mb-6">
            <button onclick="renderForum('forum-container')" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back to Posts
            </button>
            
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-6">
                <div class="flex items-center gap-2 mb-4">
                    ${post.forum_categories ? `<span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-sm rounded">${post.forum_categories.name}</span>` : ''}
                </div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">${post.title}</h2>
                <div class="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div class="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-sm font-semibold">
                        ${post.users?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">${post.users?.name || 'Unknown'}</p>
                        <p class="text-sm text-gray-500">${formatDate(post.created_at)}</p>
                    </div>
                </div>
                <div class="prose dark:prose-invert max-w-none">
                    <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${post.content}</p>
                </div>
            </div>
            
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${replies.length} Replies</h3>
            
            <div class="space-y-4 mb-6">
                ${replies.map(reply => `
                    <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs font-semibold">
                                ${reply.users?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <p class="font-medium text-sm text-gray-900 dark:text-white">${reply.users?.name || 'Unknown'}</p>
                                <p class="text-xs text-gray-500">${formatDate(reply.created_at)}</p>
                            </div>
                        </div>
                        <p class="text-gray-700 dark:text-gray-300 text-sm">${reply.content}</p>
                    </div>
                `).join('')}
            </div>
            
            <form onsubmit="submitReply(event, '${post.id}')" class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                <textarea id="reply-content" rows="3" placeholder="Write a reply..." required class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none resize-none text-gray-900 dark:text-white placeholder-gray-400"></textarea>
                <div class="flex justify-end mt-3">
                    <button type="submit" class="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:opacity-90 transition">
                        Post Reply
                    </button>
                </div>
            </form>
        </div>
    `;
}

export async function submitReply(e, postId) {
    e.preventDefault();
    const content = document.getElementById('reply-content').value;
    
    const { error } = await createReply(postId, content);
    
    if (!error) {
        const replies = await loadReplies(postId);
        const post = await loadPost(postId);
        document.getElementById('forum-container').innerHTML = renderPost(post, replies);
    }
}

window.filterPosts = async function(categoryId) {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.className = btn.className.replace('bg-black', 'bg-gray-100').replace('text-white', 'text-gray-900');
        btn.className = btn.className.replace('dark:bg-white', 'dark:bg-gray-800').replace('dark:text-black', 'dark:text-white');
    });
    event.target.className = event.target.className.replace('bg-gray-100', 'bg-black').replace('text-gray-900', 'text-white');
    event.target.className = event.target.className.replace('dark:bg-gray-800', 'dark:bg-white').replace('dark:text-white', 'dark:text-black');
    
    const posts = await loadForumPosts(categoryId);
    renderPosts(posts);
};

window.viewPost = async function(postId) {
    const post = await loadPost(postId);
    const replies = await loadReplies(postId);
    document.getElementById('forum-container').innerHTML = renderPost(post, replies);
};

window.showNewPostModal = function() {
    const modal = document.getElementById('new-post-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    loadForumCategories().then(categories => {
        const select = document.getElementById('post-category');
        select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    });
};

window.closeNewPostModal = function() {
    const modal = document.getElementById('new-post-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.submitPost = async function(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const categoryId = document.getElementById('post-category').value;
    
    const { error } = await createPost(title, content, categoryId);
    
    if (!error) {
        closeNewPostModal();
        renderForum('forum-container');
    }
};

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    return d.toLocaleDateString();
}
