from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone


def get_active_enrollments(employer, period_start, period_end):
    from core.models import Enrollment
    return Enrollment.objects.filter(
        employee__employer=employer,
        status__in=['active', 'carrier_confirmed'],
        effective_date__lte=period_end,
    ).filter(
        Q(termination_date__isnull=True) | Q(termination_date__gte=period_start)
    ).select_related('employee', 'plan', 'plan__product')


def get_rate_for_date(benefit_plan, as_of_date):
    from benefits.models import RateSchedule
    schedule = RateSchedule.objects.filter(
        benefit_plan=benefit_plan,
        effective_date__lte=as_of_date,
    ).filter(
        Q(termination_date__isnull=True) | Q(termination_date__gte=as_of_date)
    ).order_by('-effective_date').first()

    if schedule:
        return {
            'monthly_premium': schedule.monthly_premium,
            'employer_contribution': schedule.employer_contribution,
            'employee_deduction': schedule.employee_deduction,
            'admin_fee': schedule.admin_fee,
            'broker_commission': schedule.broker_commission,
            'carrier_premium': schedule.carrier_premium,
        }
    return {
        'monthly_premium': benefit_plan.monthly_premium,
        'employer_contribution': benefit_plan.employer_contribution,
        'employee_deduction': benefit_plan.employee_deduction,
        'admin_fee': Decimal('0'),
        'broker_commission': Decimal('0'),
        'carrier_premium': Decimal('0'),
    }


def calculate_proration(enrollment, period_start, period_end):
    days_in_period = (period_end - period_start).days + 1
    cov_start = max(enrollment.effective_date, period_start)
    cov_end = enrollment.termination_date
    if cov_end is None or cov_end > period_end:
        cov_end = period_end
    covered_days = (cov_end - cov_start).days + 1
    if covered_days <= 0:
        return Decimal('0')
    if covered_days >= days_in_period:
        return Decimal('1')
    return (Decimal(covered_days) / Decimal(days_in_period)).quantize(
        Decimal('0.000001'), rounding=ROUND_HALF_UP
    )


@transaction.atomic
def generate_employer_invoice(employer, period_start, period_end, issued_date=None, due_date=None):
    from core.models import EmployerInvoice, EmployerInvoiceLine
    from billing.models import BillingPeriod, InvoiceSnapshot

    if issued_date is None:
        issued_date = date.today()
    if due_date is None:
        due_date = issued_date + timedelta(days=30)

    existing = EmployerInvoice.objects.filter(
        employer=employer,
        billing_period_start=period_start,
        billing_period_end=period_end,
    ).first()
    if existing:
        return existing, False

    enrollments = get_active_enrollments(employer, period_start, period_end)
    if not enrollments.exists():
        return None, False

    seq = EmployerInvoice.objects.filter(employer=employer).count() + 1
    invoice_number = f"INV-{employer.pk:04d}-{period_start.strftime('%Y%m')}-{seq:03d}"

    invoice = EmployerInvoice.objects.create(
        employer=employer,
        invoice_number=invoice_number,
        billing_period_start=period_start,
        billing_period_end=period_end,
        premium_total=0,
        employer_share=0,
        employee_share=0,
        admin_fee=0,
        total_due=0,
        status='draft',
        issued_date=issued_date,
        due_date=due_date,
    )

    total_premium = Decimal('0')
    total_employer = Decimal('0')
    total_employee = Decimal('0')
    total_admin_fee = Decimal('0')
    snapshot_lines = []

    for enrollment in enrollments:
        rates = get_rate_for_date(enrollment.plan, period_start)
        proration = calculate_proration(enrollment, period_start, period_end)

        line_premium = (rates['monthly_premium'] * proration).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        line_employer = (rates['employer_contribution'] * proration).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        line_employee = (rates['employee_deduction'] * proration).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        line_admin = (rates['admin_fee'] * proration).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        line = EmployerInvoiceLine.objects.create(
            invoice=invoice,
            employee=enrollment.employee,
            plan=enrollment.plan,
            tier_display=enrollment.plan.get_tier_display(),
            monthly_premium=line_premium,
            employer_contribution=line_employer,
            employee_deduction=line_employee,
        )

        total_premium += line_premium
        total_employer += line_employer
        total_employee += line_employee
        total_admin_fee += line_admin

        snapshot_lines.append({
            'employee_id': enrollment.employee_id,
            'employee_name': enrollment.employee.full_name,
            'plan_id': enrollment.plan_id,
            'plan_name': str(enrollment.plan),
            'tier': enrollment.plan.tier,
            'premium': str(line_premium),
            'employer_share': str(line_employer),
            'employee_share': str(line_employee),
            'proration_factor': str(proration),
            'rates_as_of': str(period_start),
        })

    invoice.premium_total = total_premium
    invoice.employer_share = total_employer
    invoice.employee_share = total_employee
    invoice.admin_fee = total_admin_fee
    invoice.total_due = total_premium + total_admin_fee
    invoice.save()

    InvoiceSnapshot.objects.create(
        employer_invoice=invoice,
        snapshot_data={
            'employer_id': employer.pk,
            'employer_name': employer.name,
            'period_start': str(period_start),
            'period_end': str(period_end),
            'premium_total': str(total_premium),
            'employer_share': str(total_employer),
            'employee_share': str(total_employee),
            'admin_fee': str(total_admin_fee),
            'total_due': str(invoice.total_due),
            'generated_at': timezone.now().isoformat(),
        },
        line_items_data=snapshot_lines,
    )

    BillingPeriod.objects.update_or_create(
        employer=employer,
        period_start=period_start,
        defaults={
            'period_end': period_end,
            'cutoff_date': period_start - timedelta(days=1),
            'status': 'invoiced',
        },
    )

    return invoice, True


def generate_retro_credit(enrollment, original_term_date, actual_term_date):
    from billing.models import CreditMemo, CreditMemoLine
    from core.models import EmployerInvoice

    if actual_term_date >= original_term_date:
        return None

    employer = enrollment.employee.employer
    rates = get_rate_for_date(enrollment.plan, actual_term_date)

    invoices = EmployerInvoice.objects.filter(
        employer=employer,
        billing_period_start__lte=original_term_date,
        billing_period_end__gte=actual_term_date,
    ).order_by('billing_period_start')

    total_credit = Decimal('0')
    lines_data = []

    for inv in invoices:
        overlap_start = max(actual_term_date + timedelta(days=1), inv.billing_period_start)
        overlap_end = min(original_term_date, inv.billing_period_end)
        if overlap_start > overlap_end:
            continue
        days_in_period = (inv.billing_period_end - inv.billing_period_start).days + 1
        credit_days = (overlap_end - overlap_start).days + 1
        factor = Decimal(credit_days) / Decimal(days_in_period)
        credit_amount = (rates['monthly_premium'] * factor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_credit += credit_amount
        lines_data.append({
            'invoice': inv,
            'amount': credit_amount,
            'period_start': overlap_start,
            'period_end': overlap_end,
        })

    if total_credit == 0:
        return None

    seq = CreditMemo.objects.filter(employer=employer).count() + 1
    memo = CreditMemo.objects.create(
        employer=employer,
        memo_number=f"CM-{employer.pk:04d}-{seq:04d}",
        type='credit',
        amount=total_credit,
        reason=f"Retroactive termination for {enrollment.employee.full_name}: "
               f"terminated {actual_term_date} (was {original_term_date})",
        status='issued',
        effective_date=actual_term_date,
        issued_at=timezone.now(),
    )

    for ld in lines_data:
        CreditMemoLine.objects.create(
            credit_memo=memo,
            employee=enrollment.employee,
            benefit_plan=enrollment.plan,
            description=f"Retro credit {ld['period_start']} to {ld['period_end']}",
            amount=ld['amount'],
            period_start=ld['period_start'],
            period_end=ld['period_end'],
        )

    return memo
