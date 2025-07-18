# Generated by Django 5.2.1 on 2025-06-18 16:34

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comment', '0005_remove_comment_date_remove_comment_parent'),
        ('post', '0006_alter_follow_id_alter_likes_id_alter_stream_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='comment',
            name='date',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name='comment',
            name='post',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comment', to='post.post'),
        ),
    ]
