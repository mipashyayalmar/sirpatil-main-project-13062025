"use strict";

/*! lightbox.js | Friendkit | © Css Ninja. 2019-2020 */
$(function() {
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Function to format time since post (mimics Django's timesince)
    function formatTimeSince(date) {
        const now = new Date();
        const commentDate = new Date(date);
        const diff = Math.floor((now - commentDate) / 1000 / 60); // Minutes
        if (diff < 1) return 'just now';
        if (diff < 60) return `${diff}m ago`;
        return `${Math.floor(diff / 60)}h ago`;
    }

    // Function to generate comment HTML (mimics comment.html)
    function generateCommentHtml(comment, postId, isNested = false) {
        const profileImage = comment.user.profile_image ?
            `<div class="image"><img src="${comment.user.profile_image}" alt=""></div>` :
            '';
        const username = comment.user.username || 'Unknown User';
        const time = formatTimeSince(comment.date);
        const body = comment.body || '';
        const nestedClass = isNested ? 'is-nested' : '';

        let html = `
            <div class="media is-comment ${nestedClass}" id="comment-${comment.id}">
                <div class="media-left">
                    ${profileImage}
                </div>
                <div class="media-content">
                    <a href="#">${username}</a>
                    <span class="time">${time}</span>
                    <p>${body}</p>
                    <div class="controls">
                        <div class="like-count">
                            <i data-feather="thumbs-up"></i>
                            <span>0</span>
                        </div>
                        <div class="reply">
                            <a onclick="setReply('${postId}', '${comment.id}', '${username}')">Reply</a>
                        </div>
                    </div>
        `;

        // Add replies recursively
        if (comment.children && comment.children.length) {
            comment.children.forEach(reply => {
                html += generateCommentHtml(reply, postId, true);
            });
        }

        html += `</div></div>`;
        return html;
    }

    // Fetch comments via API
    function fetchComments(postId, callback) {
        if (!uuidRegex.test(postId)) {
            console.error(`Invalid UUID format for postId: ${postId}`);
            callback('<p>Error: Invalid post ID format. Please ensure post IDs are UUIDs.</p>');
            return;
        }

        console.log(`Fetching comments for post-${postId}`);
        $.ajax({
            url: `/api/posts/${postId}/comments/`,
            method: 'GET',
            success: function(data) {
                console.log(`Comments fetched for post-${postId}:`, data);
                let commentsHtml = '';
                data.forEach(comment => {
                    commentsHtml += generateCommentHtml(comment, postId);
                });
                callback(commentsHtml || '<p>No comments yet.</p>');
            },
            error: function(xhr) {
                console.error(`Failed to fetch comments for post-${postId}:`, xhr.status, xhr.responseText);
                let errorMsg = 'Error loading comments';
                if (xhr.status === 404) {
                    errorMsg = 'Error: Post not found';
                } else if (xhr.status === 500) {
                    errorMsg = `Server error: ${xhr.responseText}`;
                }
                callback(`<p>${errorMsg}</p>`);
            }
        });
    }

    if ($("[data-fancybox]").length) {
        const n = feather.icons["more-vertical"].toSvg(),
              s = feather.icons["thumbs-up"].toSvg(),
              a = feather.icons.lock.toSvg(),
              i = feather.icons.user.toSvg(),
              e = feather.icons.users.toSvg(),
              d = feather.icons.globe.toSvg(),
              t = feather.icons.heart.toSvg(),
              c = feather.icons.smile.toSvg(),
              o = feather.icons["message-circle"].toSvg();
        const csrfToken = $('meta[name="csrf-token"]').attr('content') || '';

        $("[data-fancybox]").each(function() {
            if ("comments" == $(this).attr("data-lightbox-type")) {
                const fancyboxId = $(this).attr("data-fancybox");
                console.log(`Raw data-fancybox value: ${fancyboxId}`);
                const postId = fancyboxId.replace('post', '');
                console.log(`Opening lightbox for post-${postId}`);

                // Extract post data from DOM
                const $post = $(`#feed-post-${postId}`);
                if (!$post.length) {
                    console.warn(`Post #feed-post-${postId} not found in DOM`);
                }
                const headerImage = $post.find('.user-block .image img').attr('src') || '{% static "assets/img/avatars/placeholder.jpg" %}';
                const username = $post.find('.user-info a').text() || 'Unknown User';
                const time = $post.find('.user-info .time').text() || 'Unknown time';
                const likesCount = $post.find('.likes-count span').text() || '0';
                const commentsCount = $post.find('.comments-count span').text() || '0';
                const currentUserImage = $post.find('.post-comment .image img').attr('src') || '{% static "assets/img/avatars/placeholder.jpg" %}';

                // Fetch comments dynamically
                fetchComments(postId, function(commentsHtml) {
                    const lightboxHtml = `
                        <div class="header">
                            <img src="${headerImage}" alt="">
                            <div class="user-meta">
                                <span>${username}</span>
                                <span><small>${time}</small></span>
                            </div>
                            <button type="button" class="button">Follow</button>
                            <div class="dropdown is-spaced is-right dropdown-trigger">
                                <div>
                                    <div class="button">
                                        ${n}
                                    </div>
                                </div>
                                <div class="dropdown-menu" role="menu">
                                    <div class="dropdown-content">
                                        <div class="dropdown-item is-title has-text-left">
                                            Who can see this ?
                                        </div>
                                        <a href="#" class="dropdown-item">
                                            <div class="media">
                                                ${d}
                                                <div class="media-content">
                                                    <h3>Public</h3>
                                                    <small>Anyone can see this publication.</small>
                                                </div>
                                            </div>
                                        </a>
                                        <a class="dropdown-item">
                                            <div class="media">
                                                ${e}
                                                <div class="media-content">
                                                    <h3>Friends</h3>
                                                    <small>Only friends can see this publication.</small>
                                                </div>
                                            </div>
                                        </a>
                                        <a class="dropdown-item">
                                            <div class="media">
                                                ${i}
                                                <div class="media-content">
                                                    <h3>Specific friends</h3>
                                                    <small>Don't show it to some friends.</small>
                                                </div>
                                            </div>
                                        </a>
                                        <hr class="dropdown-divider">
                                        <a class="dropdown-item">
                                            <div class="media">
                                                ${a}
                                                <div class="media-content">
                                                    <h3>Only me</h3>
                                                    <small>Only me can see this publication.</small>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="inner-content">
                            <div class="live-stats">
                                <div class="social-count">
                                    <div class="likes-count">
                                        ${t}
                                        <span>${likesCount}</span>
                                    </div>
                                    <div class="comments-count">
                                        ${o}
                                        <span>${commentsCount}</span>
                                    </div>
                                </div>
                                <div class="social-count ml-auto">
                                    <div class="views-count">
                                        <span>${commentsCount}</span>
                                        <span class="views"><small>comments</small></span>
                                    </div>
                                </div>
                            </div>
                            <div class="actions">
                                <div class="action">
                                    ${s}
                                    <span>Like</span>
                                </div>
                                <div class="action">
                                    ${o}
                                    <span>Comment</span>
                                </div>
                            </div>
                        </div>

                        <div class="comments-list has-slimscroll">
                            ${commentsHtml}
                        </div>

                        <div class="comment-controls has-lightbox-emojis">
                            <div class="controls-inner">
                                <form method="POST" action="/" class="media post-comment lightbox-comment-form" data-post-id="${postId}">
                                    <input type="hidden" name="csrfmiddlewaretoken" value="${csrfToken}">
                                    <input type="hidden" name="post_id" value="${postId}">
                                    <div class="media-content">
                                        <div class="field">
                                            <p class="control">
                                                <img class="is-rounded image is-32x32" src="${currentUserImage}" alt="">
                                            </p>
                                        </div>
                                        <div class="control">
                                            <textarea class="textarea is-rounded" name="body" rows="2" placeholder="Write a comment..." required></textarea>
                                        </div>
                                        <div class="actions">
                                            <div class="action is-emoji">
                                                <button class="emoji-button" type="button">
                                                    ${c}
                                                </button>
                                            </div>
                                            <button type="submit" class="button is-small is-primary">Post Comment</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    `;

                    $(this).fancybox({
                        baseClass: "fancybox-custom-layout",
                        keyboard: false,
                        infobar: false,
                        touch: {
                            vertical: false
                        },
                        buttons: ["close", "thumbs", "share"],
                        animationEffect: "fade",
                        transitionEffect: "fade",
                        preventCaptionOverlap: false,
                        idleTime: false,
                        gutter: 0,
                        caption: function() {
                            return lightboxHtml;
                        },
                        afterShow: function(instance, slide) {
                            initDropdowns();
                            initLightboxEmojis();
                            feather.replace();

                            // Handle lightbox comment form submission
                            $('.lightbox-comment-form').off('submit').on('submit', function(e) {
                                e.preventDefault();
                                const form = $(this);
                                const postId = form.data('post-id');
                                const formData = new FormData(this);

                                $.ajax({
                                    url: '/',
                                    method: 'POST',
                                    data: formData,
                                    processData: false,
                                    contentType: false,
                                    headers: {
                                        'X-CSRFToken': csrfToken,
                                        'X-Requested-With': 'XMLHttpRequest'
                                    },
                                    success: function(data) {
                                        if (data.success) {
                                            fetchComments(postId, function(commentsHtml) {
                                                form.closest('.fancybox-content').find('.comments-list').html(commentsHtml);
                                                form.find('textarea').val('');
                                                feather.replace();
                                                form.closest('.fancybox-content').find('.comments-count span').text($('.comments-list .is-comment').length);
                                            });
                                        } else {
                                            console.error('Comment submission failed:', data.error);
                                        }
                                    },
                                    error: function(xhr) {
                                        console.error('Error submitting comment:', xhr.status, xhr.responseText);
                                    }
                                });
                            });

                            if ("development" === env) {
                                $(".fancybox-container [data-demo-src]").each(function() {
                                    var src = $(this).attr("data-demo-src");
                                    $(this).attr("src", src);
                                });
                            }
                        }
                    });
                }.bind(this));
            }
        });
    }
});