import os
import anthropic
from core.models import (
    Exception as TpaException, ExceptionNote, Enrollment,
    Employee, Dependent, CarrierInvoice, EmployerInvoice,
)

CATEGORY_PROMPTS = {
    'aging_out': (
        'Draft a dependent aging-out notification letter to the employee, and a '
        'COBRA election notice. Include: the dependent\'s name, the date they lose '
        'eligibility, what coverage ends, COBRA continuation options with estimated '
        'costs, and the 60-day election deadline. Be professional and empathetic.'
    ),
    'invoice_discrepancy': (
        'Analyze this invoice discrepancy and draft a dispute email to the carrier. '
        'Include: the invoice number, the billed vs expected amounts, possible causes '
        '(rate changes, enrollment count mismatches, retroactive adjustments), and a '
        'request for a line-by-line breakdown. Be professional and firm.'
    ),
    'missing_info': (
        'Draft an email to the employer\'s HR contact requesting the missing information. '
        'Explain why it\'s needed (carrier eligibility file requirements), the deadline, '
        'and consequences of not providing it. Be professional but clear about urgency.'
    ),
    'enrollment_gap': (
        'Draft a communication to the employee asking them to confirm whether they '
        'intentionally waived this coverage or if this is an error that needs to be '
        'corrected. Include instructions for how to enroll if they want to, and note '
        'any special enrollment period deadlines.'
    ),
    'payment_overdue': (
        'Draft a payment reminder letter to the employer. Include: the invoice number, '
        'amount due, original due date, days overdue, and consequences of non-payment '
        '(potential coverage lapse). Escalate tone based on how overdue it is. '
        'Include payment instructions.'
    ),
    'cobra_deadline': (
        'Draft a complete COBRA election notice packet. Include: the qualifying event, '
        'the coverage options available for continuation, the monthly premium for each, '
        'the 60-day election deadline, instructions for how to elect, and contact info. '
        'Follow DOL Model COBRA notice guidelines.'
    ),
    'eligibility_error': (
        'Analyze the eligibility file error and draft a corrective action plan. '
        'Include: what went wrong, the specific data that needs to be fixed, '
        'steps to correct and resubmit the file, and how to prevent recurrence.'
    ),
    'term_pending': (
        'Create a termination checklist and draft notification to the carrier. '
        'Include: the employee\'s last coverage date, any COBRA obligations, '
        'final deduction calculations, and carrier notification requirements.'
    ),
    'rate_change': (
        'Draft a rate change summary for the employer. Include: current vs new rates '
        'by tier, the effective date, the impact on employer and employee contributions, '
        'total monthly cost change, and a recommendation on whether to negotiate or '
        'explore alternatives.'
    ),
    'compliance': (
        'Draft a compliance action plan with specific steps, deadlines, and '
        'responsible parties. Include relevant regulatory requirements and '
        'consequences of non-compliance.'
    ),
    'claim_issue': (
        'Analyze the claim issue and recommend a resolution. If it\'s a denied claim, '
        'draft an appeal letter. If it\'s a processing error, draft a correction request. '
        'Include relevant claim details and supporting documentation needed.'
    ),
    'other': (
        'Analyze this exception and provide a recommended resolution with specific '
        'action steps, communications that need to be sent, and a timeline.'
    ),
}


def build_context(exception):
    parts = [f'Exception: {exception.title}']
    parts.append(f'Category: {exception.get_category_display()}')
    parts.append(f'Priority: {exception.get_priority_display()}')
    parts.append(f'Description: {exception.description}')

    if exception.employer:
        parts.append(f'Employer: {exception.employer.name}')

    if exception.employee:
        emp = exception.employee
        parts.append(f'Employee: {emp.full_name}, DOB: {emp.date_of_birth}, '
                      f'Hire date: {emp.hire_date}, Status: {emp.status}')

        enrollments = Enrollment.objects.filter(
            employee=emp, status__in=['active', 'carrier_confirmed']
        ).select_related('plan', 'plan__carrier')
        if enrollments:
            parts.append('Current enrollments:')
            for e in enrollments:
                parts.append(f'  - {e.plan.name} ({e.plan.carrier.name}): '
                             f'${e.plan.monthly_premium}/mo, tier: {e.plan.get_tier_display()}')

        dependents = Dependent.objects.filter(employee=emp)
        if dependents:
            parts.append('Dependents:')
            for d in dependents:
                parts.append(f'  - {d.full_name}, {d.get_relationship_display()}, DOB: {d.date_of_birth}')

    if exception.carrier:
        parts.append(f'Carrier: {exception.carrier.name}')
        invoices = CarrierInvoice.objects.filter(
            carrier=exception.carrier,
            employer=exception.employer,
        ).order_by('-billing_period_start')[:3]
        if invoices:
            parts.append('Recent carrier invoices:')
            for inv in invoices:
                parts.append(f'  - {inv.invoice_number}: billed ${inv.billed_amount}, '
                             f'expected ${inv.expected_amount}, status: {inv.status}')

    notes = ExceptionNote.objects.filter(exception=exception).order_by('created_at')
    if notes:
        parts.append('Previous notes:')
        for note in notes:
            parts.append(f'  [{note.get_note_type_display()} by {note.author} on '
                         f'{note.created_at.strftime("%Y-%m-%d")}]: {note.content}')

    if exception.due_date:
        from datetime import date
        days = (exception.due_date - date.today()).days
        parts.append(f'Due date: {exception.due_date} ({days} days {"remaining" if days >= 0 else "overdue"})')

    return '\n'.join(parts)


def resolve_exception(exception_id):
    exception = TpaException.objects.select_related(
        'employer', 'employee', 'carrier'
    ).get(id=exception_id)

    category_prompt = CATEGORY_PROMPTS.get(exception.category, CATEGORY_PROMPTS['other'])
    context = build_context(exception)

    client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))

    message = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=2000,
        system=(
            'You are an AI assistant for Summit TPA, a third-party benefits administrator. '
            'You help TPA staff resolve exceptions by drafting communications, analyzing data, '
            'and recommending actions. Be professional, accurate, and actionable. '
            'Format your response with clear sections using markdown headers.'
        ),
        messages=[{
            'role': 'user',
            'content': (
                f'{category_prompt}\n\n'
                f'Here is the full context from our system:\n\n{context}'
            ),
        }],
    )

    return message.content[0].text
