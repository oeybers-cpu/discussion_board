// Discussion Board JavaScript
class DiscussionBoard {
    constructor() {
        this.comments = this.loadComments();
        this.currentReplyTo = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderComments();
        this.updateStats();
        this.updateParentSelect();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Form submission
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addComment();
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllComments();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportComments();
        });

        // Home button
        document.getElementById('homeButton').addEventListener('click', () => {
            window.location.reload();
        });

        // Refresh button
        document.getElementById('refreshButton').addEventListener('click', () => {
            this.refreshComments();
        });

        // Listen for storage changes (for real-time updates across tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'discussionComments') {
                this.comments = this.loadComments();
                this.renderComments();
                this.updateStats();
                this.updateParentSelect();
            }
        });

        // Auto-save form data
        document.getElementById('userName').addEventListener('input', this.saveFormData.bind(this));
        document.getElementById('commentText').addEventListener('input', this.saveFormData.bind(this));
        
        // Load saved form data
        this.loadFormData();
    }

    addComment() {
        const userName = document.getElementById('userName').value.trim();
        const commentText = document.getElementById('commentText').value.trim();
        const parentId = document.getElementById('parentComment').value;

        if (!userName || !commentText) {
            this.showNotification('Please fill in all required fields!', 'error');
            return;
        }

        const comment = {
            id: this.generateId(),
            author: userName,
            text: commentText,
            timestamp: new Date().toISOString(),
            parentId: parentId || null,
            replies: []
        };

        if (parentId) {
            // Add as reply
            this.addReplyToComment(parentId, comment);
        } else {
            // Add as new comment
            this.comments.push(comment);
        }

        this.saveComments();
        this.renderComments();
        this.updateStats();
        this.updateParentSelect();
        this.clearForm();
        this.showNotification('Comment posted successfully!');
    }

    addReplyToComment(parentId, reply) {
        const findAndAddReply = (comments) => {
            for (let comment of comments) {
                if (comment.id === parentId) {
                    comment.replies.push(reply);
                    return true;
                }
                if (comment.replies && comment.replies.length > 0) {
                    if (findAndAddReply(comment.replies)) {
                        return true;
                    }
                }
            }
            return false;
        };

        findAndAddReply(this.comments);
    }

    renderComments() {
        const container = document.getElementById('commentsContainer');
        
        if (this.comments.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <div style="color: var(--lighter-accent); font-size: 1.1rem;">
                        <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                        No comments yet. Be the first to start the discussion!
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.comments.forEach(comment => {
            container.appendChild(this.createCommentElement(comment));
        });
    }

    createCommentElement(comment, isReply = false) {
        const commentDiv = document.createElement('div');
        commentDiv.className = `comment ${isReply ? 'reply' : ''}`;
        commentDiv.dataset.commentId = comment.id;

        const timeAgo = this.getTimeAgo(comment.timestamp);
        
        commentDiv.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">
                    <i class="fas fa-user"></i> ${this.escapeHtml(comment.author)}
                </span>
                <span class="comment-time">
                    <i class="fas fa-clock"></i> ${timeAgo}
                </span>
            </div>
            <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            <div class="comment-actions">
                <button class="reply-btn" onclick="discussionBoard.setReplyTo('${comment.id}', '${this.escapeHtml(comment.author)}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
                <span style="color: var(--lighter-accent); font-size: 0.8rem;">
                    ${comment.replies ? comment.replies.length : 0} replies
                </span>
            </div>
        `;

        // Add replies
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'replies-container';
            repliesContainer.style.marginTop = '15px';
            
            comment.replies.forEach(reply => {
                repliesContainer.appendChild(this.createCommentElement(reply, true));
            });
            
            commentDiv.appendChild(repliesContainer);
        }

        return commentDiv;
    }

    setReplyTo(commentId, authorName) {
        const select = document.getElementById('parentComment');
        select.value = commentId;
        
        // Scroll to form
        document.getElementById('commentForm').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
        // Focus on comment text
        document.getElementById('commentText').focus();
        
        this.showNotification(`Replying to ${authorName}`, 'info');
    }

    updateParentSelect() {
        const select = document.getElementById('parentComment');
        const currentValue = select.value;
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">New comment</option>';
        
        // Add all comments as options
        const addCommentOptions = (comments, prefix = '') => {
            comments.forEach(comment => {
                const option = document.createElement('option');
                option.value = comment.id;
                option.textContent = `${prefix}Reply to ${comment.author}: ${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}`;
                select.appendChild(option);
                
                // Add nested replies
                if (comment.replies && comment.replies.length > 0) {
                    addCommentOptions(comment.replies, prefix + '  ');
                }
            });
        };
        
        addCommentOptions(this.comments);
        
        // Restore previous value if it still exists
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }
    }

    updateStats() {
        const totalComments = this.getTotalCommentsCount();
        const uniqueUsers = this.getUniqueUsersCount();
        const totalReplies = this.getTotalRepliesCount();
        const lastActivity = this.getLastActivity();

        document.getElementById('totalComments').textContent = totalComments;
        document.getElementById('totalUsers').textContent = uniqueUsers;
        document.getElementById('totalReplies').textContent = totalReplies;
        document.getElementById('lastActivity').textContent = lastActivity;
        document.getElementById('commentCount').textContent = totalComments;
    }

    getTotalCommentsCount() {
        const countComments = (comments) => {
            let count = comments.length;
            comments.forEach(comment => {
                if (comment.replies) {
                    count += countComments(comment.replies);
                }
            });
            return count;
        };
        return countComments(this.comments);
    }

    getUniqueUsersCount() {
        const users = new Set();
        const addUsers = (comments) => {
            comments.forEach(comment => {
                users.add(comment.author.toLowerCase());
                if (comment.replies) {
                    addUsers(comment.replies);
                }
            });
        };
        addUsers(this.comments);
        return users.size;
    }

    getTotalRepliesCount() {
        const countReplies = (comments) => {
            let count = 0;
            comments.forEach(comment => {
                if (comment.replies) {
                    count += comment.replies.length;
                    count += countReplies(comment.replies);
                }
            });
            return count;
        };
        return countReplies(this.comments);
    }

    getLastActivity() {
        if (this.comments.length === 0) return 'Never';
        
        let latestTime = new Date(0);
        const findLatest = (comments) => {
            comments.forEach(comment => {
                const commentTime = new Date(comment.timestamp);
                if (commentTime > latestTime) {
                    latestTime = commentTime;
                }
                if (comment.replies) {
                    findLatest(comment.replies);
                }
            });
        };
        
        findLatest(this.comments);
        return this.getTimeAgo(latestTime.toISOString());
    }

    clearAllComments() {
        if (confirm('Are you sure you want to clear all comments? This action cannot be undone.')) {
            this.comments = [];
            this.saveComments();
            this.renderComments();
            this.updateStats();
            this.updateParentSelect();
            this.showNotification('All comments cleared!', 'info');
        }
    }

    exportComments() {
        const data = {
            exportDate: new Date().toISOString(),
            totalComments: this.getTotalCommentsCount(),
            comments: this.comments
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `discussion-board-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Comments exported successfully!', 'info');
    }

    refreshComments() {
        this.comments = this.loadComments();
        this.renderComments();
        this.updateStats();
        this.updateParentSelect();
        this.showNotification('Comments refreshed!', 'info');
    }

    clearForm() {
        document.getElementById('commentText').value = '';
        document.getElementById('parentComment').value = '';
        this.clearFormData();
    }

    saveFormData() {
        const formData = {
            userName: document.getElementById('userName').value,
            commentText: document.getElementById('commentText').value
        };
        localStorage.setItem('discussionFormData', JSON.stringify(formData));
    }

    loadFormData() {
        const saved = localStorage.getItem('discussionFormData');
        if (saved) {
            const formData = JSON.parse(saved);
            document.getElementById('userName').value = formData.userName || '';
            document.getElementById('commentText').value = formData.commentText || '';
        }
    }

    clearFormData() {
        localStorage.removeItem('discussionFormData');
    }

    loadComments() {
        const saved = localStorage.getItem('discussionComments');
        return saved ? JSON.parse(saved) : [];
    }

    saveComments() {
        localStorage.setItem('discussionComments', JSON.stringify(this.comments));
        // Trigger storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'discussionComments',
            newValue: JSON.stringify(this.comments)
        }));
    }

    startAutoRefresh() {
        // Check for updates every 5 seconds
        setInterval(() => {
            const currentComments = this.loadComments();
            const currentCount = this.getTotalCommentsCount();
            const newCount = this.getTotalCommentsCountFromData(currentComments);
            
            if (newCount !== currentCount) {
                this.comments = currentComments;
                this.renderComments();
                this.updateStats();
                this.updateParentSelect();
            }
        }, 5000);
    }

    getTotalCommentsCountFromData(comments) {
        const countComments = (comments) => {
            let count = comments.length;
            comments.forEach(comment => {
                if (comment.replies) {
                    count += countComments(comment.replies);
                }
            });
            return count;
        };
        return countComments(comments);
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const textElement = document.getElementById('notificationText');
        
        textElement.textContent = message;
        
        // Update icon based on type
        const icon = notification.querySelector('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 
                        type === 'info' ? 'fas fa-info-circle' : 'fas fa-check-circle';
        
        // Update colors based on type
        if (type === 'error') {
            notification.style.background = 'linear-gradient(90deg, #f44336, #d32f2f)';
        } else if (type === 'info') {
            notification.style.background = 'linear-gradient(90deg, #2196f3, #1976d2)';
        } else {
            notification.style.background = 'linear-gradient(90deg, var(--digital-purple), var(--royal-blue))';
        }
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the discussion board when the page loads
let discussionBoard;
document.addEventListener('DOMContentLoaded', () => {
    discussionBoard = new DiscussionBoard();
});

// Add some demo data if no comments exist
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (discussionBoard.comments.length === 0) {
            // Add a welcome comment
            const welcomeComment = {
                id: 'welcome-' + Date.now(),
                author: 'Discussion Board',
                text: 'Welcome to the Live Discussion Board! This is where you can share your thoughts and engage with others. Your comments are saved locally and will persist across browser sessions.',
                timestamp: new Date().toISOString(),
                parentId: null,
                replies: []
            };
            
            discussionBoard.comments.push(welcomeComment);
            discussionBoard.saveComments();
            discussionBoard.renderComments();
            discussionBoard.updateStats();
            discussionBoard.updateParentSelect();
        }
    }, 1000);
});

