from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from django.http import HttpResponseRedirect

from post.models import Post, Tag, Follow, Stream, Likes
from django.contrib.auth.models import User
from post.forms import NewPostform
from authy.models import Profile
from django.urls import resolve
from comment.models import Comment
from comment.forms import NewCommentForm
from django.core.paginator import Paginator

from django.db.models import Q
# from post.models import Post, Follow, Stream
# post/views.py
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.paginator import Paginator
from post.models import Post, Stream, Follow
from comment.models import Comment
from comment.forms import NewCommentForm
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)

@login_required
def index(request):
    user = request.user
    all_users = User.objects.exclude(id=user.id)
    profiles = Profile.objects.all()
    followed_users = Follow.objects.filter(follower=user).values_list('following__id', flat=True)
    
    posts = Stream.objects.filter(user=user)
    group_ids = [post.post_id for post in posts]
    post_items = Post.objects.filter(id__in=group_ids).all().order_by('-posted')

    if request.method == "POST":
        form = NewCommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.user = user
            post_id = request.POST.get('post_id')
            post = get_object_or_404(Post, id=post_id)
            comment.post = post
            parent_id = request.POST.get('parent')
            if parent_id:
                parent = get_object_or_404(Comment, id=parent_id)
                comment.parent = parent
            comment.save()
            # Check for AJAX request
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True, 'comment_id': str(comment.id)})
            return HttpResponseRedirect(reverse('index'))
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': form.errors}, status=400)
            # Fallback for non-AJAX
            logger.error(f"Form errors: {form.errors}")
    else:
        form = NewCommentForm()

    query = request.GET.get('q')
    if query:
        users = User.objects.filter(Q(username__icontains=query))
        paginator = Paginator(users, 6)
        page_number = request.GET.get('page')
        users_paginator = paginator.get_page(page_number)
    else:
        users_paginator = None

    context = {
        'post_items': post_items,
        'profiles': profiles,
        'all_users': all_users,
        'followed_users': followed_users,
        'form': form,
        'users_paginator': users_paginator,
    }
    return render(request, 'index.html', context)

@login_required
def PostDetail(request, post_id):
    user = request.user
    post = get_object_or_404(Post, id=post_id)
    comments = Comment.objects.filter(post=post, parent=None).order_by('-date')

    if request.method == "POST":
        form = NewCommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.post = post
            comment.user = user
            parent_id = request.POST.get('parent')
            if parent_id:
                parent = get_object_or_404(Comment, id=parent_id)
                comment.parent = parent
            comment.save()
            return HttpResponseRedirect(reverse('post-details', args=[post.id]))
    else:
        form = NewCommentForm()

    context = {
        'post': post,
        'form': form,
        'comments': comments
    }
    return render(request, 'postdetail.html', context)

def post_comments(request, post_id):
    logger.info(f"Received request for comments on post_id: {post_id}")
    try:
        post = get_object_or_404(Post, id=post_id)
        comments = Comment.objects.filter(post=post, parent=None)
        comments_data = []
        for comment in comments:
            comments_data.append({
                'id': comment.id,
                'user': {
                    'username': comment.user.username,
                    'profile_image': comment.user.profile.image.url if comment.user.profile.image else None
                },
                'body': comment.body,
                'date': comment.date.isoformat(),
                'children': [
                    {
                        'id': reply.id,
                        'user': {
                            'username': reply.user.username,
                            'profile_image': reply.user.profile.image.url if reply.user.profile.image else None
                        },
                        'body': reply.body,
                        'date': reply.date.isoformat(),
                        'children': []
                    } for reply in comment.replies.all()
                ]
            })
        logger.info(f"Returning {len(comments_data)} comments for post_id: {post_id}")
        return JsonResponse(comments_data, safe=False)
    except Exception as e:
        logger.error(f"Error fetching comments for post_id {post_id}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
@login_required
def NewPost(request):
    user = request.user
    profile = get_object_or_404(Profile, user=user)
    tags_obj = []
    
    if request.method == "POST":
        form = NewPostform(request.POST, request.FILES)
        if form.is_valid():
            picture = form.cleaned_data.get('picture')
            caption = form.cleaned_data.get('caption')
            tag_form = form.cleaned_data.get('tags')
            tag_list = list(tag_form.split(','))

            for tag in tag_list:
                t, created = Tag.objects.get_or_create(title=tag)
                tags_obj.append(t)
            p, created = Post.objects.get_or_create(picture=picture, caption=caption, user=user)
            p.tags.set(tags_obj)
            p.save()
            return redirect('profile', request.user.username)
    else:
        form = NewPostform()
    context = {
        'form': form
    }
    return render(request, 'newpost.html', context)

@login_required
def Tags(request, tag_slug):
    tag = get_object_or_404(Tag, slug=tag_slug)
    posts = Post.objects.filter(tags=tag).order_by('-posted')

    context = {
        'posts': posts,
        'tag': tag

    }
    return render(request, 'tag.html', context)


# Like function
@login_required
def like(request, post_id):
    user = request.user
    post = Post.objects.get(id=post_id)
    current_likes = post.likes
    liked = Likes.objects.filter(user=user, post=post).count()

    if not liked:
        Likes.objects.create(user=user, post=post)
        current_likes = current_likes + 1
    else:
        Likes.objects.filter(user=user, post=post).delete()
        current_likes = current_likes - 1
        
    post.likes = current_likes
    post.save()
    # return HttpResponseRedirect(reverse('post-details', args=[post_id]))
    return HttpResponseRedirect(reverse('post-details', args=[post_id]))

@login_required
def favourite(request, post_id):
    user = request.user
    post = Post.objects.get(id=post_id)
    profile = Profile.objects.get(user=user)

    if profile.favourite.filter(id=post_id).exists():
        profile.favourite.remove(post)
    else:
        profile.favourite.add(post)
    return HttpResponseRedirect(reverse('post-details', args=[post_id]))


