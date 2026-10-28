# Step 3: Remove old fields from BenefitPlan, make product FK non-null, add unique_together

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_populate_benefit_products'),
    ]

    operations = [
        migrations.AlterField(
            model_name='benefitplan',
            name='product',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tiers', to='core.benefitproduct'),
        ),
        migrations.AlterUniqueTogether(
            name='benefitplan',
            unique_together={('product', 'tier')},
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='active',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='carrier',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='effective_date',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='employer',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='name',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='plan_type',
        ),
        migrations.RemoveField(
            model_name='benefitplan',
            name='termination_date',
        ),
        migrations.AlterModelOptions(
            name='employerinvoiceline',
            options={'ordering': ['employee__last_name', 'employee__first_name', 'plan__product__plan_type']},
        ),
    ]
