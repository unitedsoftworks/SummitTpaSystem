from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum

from core.models import (
    Dependent, Employee, Employer, CarrierInvoice, Enrollment,
    BenefitPlan, Exception as TpaException, EmployerInvoice,
)


class Command(BaseCommand):
    help = 'Scan system data and auto-create exceptions for items needing attention'

    def handle(self, *args, **options):
        today = date.today()
        created = 0

        created += self.scan_aging_dependents(today)
        created += self.scan_invoice_discrepancies()
        created += self.scan_overdue_payments(today)
        created += self.scan_enrollment_gaps()
        created += self.scan_missing_info()
        created += self.scan_upcoming_renewals(today)
        created += self.scan_termination_pending(today)

        self.stdout.write(self.style.SUCCESS(f'Scan complete. {created} new exception(s) created.'))

    def _exists(self, **kwargs):
        return TpaException.objects.filter(
            status__in=['open', 'in_progress'], **kwargs
        ).exists()

    def scan_aging_dependents(self, today):
        count = 0
        cutoff_26 = today + timedelta(days=90)
        aging = Dependent.objects.filter(
            date_of_birth__isnull=False,
            employee__status='active',
        ).select_related('employee', 'employee__employer')

        for dep in aging:
            age_26_date = dep.date_of_birth.replace(year=dep.date_of_birth.year + 26)
            if today < age_26_date <= cutoff_26:
                if not self._exists(
                    category='aging_out',
                    employee=dep.employee,
                    title__icontains=dep.full_name,
                ):
                    days_left = (age_26_date - today).days
                    TpaException.objects.create(
                        title=f'{dep.full_name} turns 26 on {age_26_date}',
                        category='aging_out',
                        priority='high' if days_left <= 30 else 'medium',
                        description=(
                            f'{dep.full_name} (dependent of {dep.employee.full_name}, '
                            f'{dep.employee.employer.name}) will turn 26 on {age_26_date} '
                            f'and will lose eligibility. {days_left} days remaining. '
                            f'Send termination notice and prepare COBRA election packet.'
                        ),
                        due_date=age_26_date - timedelta(days=30),
                        employer=dep.employee.employer,
                        employee=dep.employee,
                    )
                    count += 1
        return count

    def scan_invoice_discrepancies(self):
        count = 0
        for inv in CarrierInvoice.objects.select_related('carrier', 'employer').all():
            diff = abs(inv.billed_amount - inv.expected_amount)
            if diff > Decimal('0.01'):
                if not self._exists(
                    category='invoice_discrepancy',
                    carrier=inv.carrier,
                    employer=inv.employer,
                    title__icontains=inv.invoice_number,
                ):
                    TpaException.objects.create(
                        title=f'{inv.carrier.name} invoice ${diff:.2f} discrepancy ({inv.invoice_number})',
                        category='invoice_discrepancy',
                        priority='critical' if diff > Decimal('100') else 'high',
                        description=(
                            f'Carrier invoice {inv.invoice_number} from {inv.carrier.name} for '
                            f'{inv.employer.name}: billed ${inv.billed_amount:.2f} vs '
                            f'expected ${inv.expected_amount:.2f} (difference: ${diff:.2f}). '
                            f'Investigate rate discrepancies, retroactive adjustments, '
                            f'or enrollment count mismatches.'
                        ),
                        due_date=date.today() + timedelta(days=5),
                        employer=inv.employer,
                        carrier=inv.carrier,
                    )
                    count += 1
        return count

    def scan_overdue_payments(self, today):
        count = 0
        overdue = EmployerInvoice.objects.filter(
            status__in=['sent', 'partial'],
            due_date__lt=today,
        ).select_related('employer')

        for inv in overdue:
            days_overdue = (today - inv.due_date).days
            if not self._exists(
                category='payment_overdue',
                employer=inv.employer,
                title__icontains=inv.invoice_number,
            ):
                TpaException.objects.create(
                    title=f'{inv.employer.name} payment overdue ({inv.invoice_number})',
                    category='payment_overdue',
                    priority='critical' if days_overdue > 30 else 'high',
                    description=(
                        f'{inv.employer.name} has not paid invoice {inv.invoice_number} '
                        f'(due {inv.due_date}, {days_overdue} days overdue). '
                        f'Total outstanding: ${inv.total_due}. '
                        f'Send reminder and escalate if >30 days overdue.'
                    ),
                    due_date=today + timedelta(days=3),
                    employer=inv.employer,
                )
                count += 1
        return count

    def scan_enrollment_gaps(self):
        count = 0
        for employee in Employee.objects.filter(status='active').select_related('employer'):
            enrolled_types = set(
                Enrollment.objects.filter(
                    employee=employee,
                    status__in=['active', 'carrier_confirmed'],
                ).values_list('plan__plan_type', flat=True)
            )
            available_types = set(
                BenefitPlan.objects.filter(
                    employer=employee.employer,
                    active=True,
                ).values_list('plan_type', flat=True)
            )
            missing = available_types - enrolled_types
            if 'medical' in missing:
                if not self._exists(
                    category='enrollment_gap',
                    employee=employee,
                    title__icontains='medical',
                ):
                    TpaException.objects.create(
                        title=f'{employee.full_name} missing medical enrollment',
                        category='enrollment_gap',
                        priority='high',
                        description=(
                            f'{employee.full_name} at {employee.employer.name} has no active '
                            f'medical enrollment but medical plans are available. Verify whether '
                            f'coverage was waived or if this is a processing error.'
                        ),
                        employer=employee.employer,
                        employee=employee,
                    )
                    count += 1
        return count

    def scan_missing_info(self):
        count = 0
        for emp in Employee.objects.filter(status='active', ssn_last_four='').select_related('employer'):
            if not self._exists(category='missing_info', employee=emp, title__icontains='SSN'):
                TpaException.objects.create(
                    title=f'{emp.full_name} missing SSN on file',
                    category='missing_info',
                    priority='medium',
                    description=(
                        f'{emp.full_name} at {emp.employer.name} does not have a Social Security '
                        f'Number on file. Carriers require SSN for eligibility file submissions.'
                    ),
                    employer=emp.employer,
                    employee=emp,
                )
                count += 1
        return count

    def scan_upcoming_renewals(self, today):
        count = 0
        renewal_window = today + timedelta(days=90)
        plans = BenefitPlan.objects.filter(
            active=True,
            termination_date__isnull=False,
            termination_date__lte=renewal_window,
            termination_date__gte=today,
        ).select_related('carrier', 'employer')

        for plan in plans:
            if not self._exists(
                category='rate_change',
                carrier=plan.carrier,
                title__icontains=plan.name,
            ):
                days_left = (plan.termination_date - today).days
                TpaException.objects.create(
                    title=f'{plan.name} renewal in {days_left} days',
                    category='rate_change',
                    priority='high' if days_left <= 30 else 'medium',
                    description=(
                        f'{plan.name} ({plan.carrier.name}) for {plan.employer.name} '
                        f'expires on {plan.termination_date}. Request renewal rates from carrier '
                        f'and prepare rate comparison for employer.'
                    ),
                    due_date=plan.termination_date - timedelta(days=30),
                    employer=plan.employer,
                    carrier=plan.carrier,
                )
                count += 1
        return count

    def scan_termination_pending(self, today):
        count = 0
        recently_termed = Employee.objects.filter(
            status='terminated',
            termination_date__gte=today - timedelta(days=7),
            termination_date__lte=today,
        ).select_related('employer')

        for emp in recently_termed:
            if not self._exists(category='cobra_deadline', employee=emp):
                TpaException.objects.create(
                    title=f'COBRA notice required for {emp.full_name}',
                    category='cobra_deadline',
                    priority='high',
                    description=(
                        f'{emp.full_name} was terminated from {emp.employer.name} on '
                        f'{emp.termination_date}. COBRA election notice must be sent within '
                        f'14 days of qualifying event. 60-day election period starts on notice date. '
                        f'Prepare COBRA packet with coverage options and premium amounts.'
                    ),
                    due_date=emp.termination_date + timedelta(days=14),
                    employer=emp.employer,
                    employee=emp,
                )
                count += 1
        return count
