# Step 1: Create BenefitProduct model and add nullable product FK to BenefitPlan

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_exceptionnote_attachment'),
    ]

    operations = [
        migrations.CreateModel(
            name='BenefitProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('plan_type', models.CharField(choices=[('medical', 'Medical'), ('dental', 'Dental'), ('vision', 'Vision'), ('life', 'Life')], max_length=50)),
                ('effective_date', models.DateField()),
                ('termination_date', models.DateField(blank=True, null=True)),
                ('active', models.BooleanField(default=True)),
                ('carrier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='core.carrier')),
                ('employer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='core.employer')),
            ],
        ),
        migrations.AddField(
            model_name='benefitplan',
            name='product',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='tiers', to='core.benefitproduct'),
        ),
    ]
