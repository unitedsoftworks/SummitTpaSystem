# Step 2: Data migration - create BenefitProduct records from distinct plans and link tiers

from django.db import migrations


def populate_products(apps, schema_editor):
    BenefitPlan = apps.get_model('core', 'BenefitPlan')
    BenefitProduct = apps.get_model('core', 'BenefitProduct')

    seen = {}
    for plan in BenefitPlan.objects.all():
        key = (plan.employer_id, plan.carrier_id, plan.name, plan.plan_type)
        if key not in seen:
            product = BenefitProduct.objects.create(
                employer_id=plan.employer_id,
                carrier_id=plan.carrier_id,
                name=plan.name,
                plan_type=plan.plan_type,
                effective_date=plan.effective_date,
                termination_date=plan.termination_date,
                active=plan.active,
            )
            seen[key] = product
        plan.product = seen[key]
        plan.save()


def reverse_products(apps, schema_editor):
    BenefitPlan = apps.get_model('core', 'BenefitPlan')
    BenefitProduct = apps.get_model('core', 'BenefitProduct')
    for plan in BenefitPlan.objects.select_related('product').all():
        if plan.product:
            plan.employer_id = plan.product.employer_id
            plan.carrier_id = plan.product.carrier_id
            plan.name = plan.product.name
            plan.plan_type = plan.product.plan_type
            plan.effective_date = plan.product.effective_date
            plan.termination_date = plan.product.termination_date
            plan.active = plan.product.active
            plan.product = None
            plan.save()
    BenefitProduct.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_add_benefit_product_refactor_plan'),
    ]

    operations = [
        migrations.RunPython(populate_products, reverse_products),
    ]
