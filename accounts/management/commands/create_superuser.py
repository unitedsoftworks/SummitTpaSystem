from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = 'Create a superuser with admin role for SummitTPA'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin')
        parser.add_argument('--email', default='admin@summittpa.com')
        parser.add_argument('--password', default='admin12345!')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User "{username}" already exists'))
            return

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin',
            require_mfa=False,
        )
        self.stdout.write(self.style.SUCCESS(
            f'Superuser "{user.username}" created (role=admin, MFA disabled)'
        ))
