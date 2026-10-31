from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from core.models import (
    Association, Vendor, Employer, BenefitProduct, BenefitPlan,
    PremiumAllocation, Employee,
    Dependent, Enrollment, EnrollmentMember, Claim, PayrollDeduction,
    CarrierInvoice, AuditLog, Message, LifeEvent, Reimbursement, Payment,
    EligibilityRecord, CobraEvent, OpenEnrollmentPeriod, Document, Notification,
)


class Command(BaseCommand):
    help = 'Seed database with realistic demo data for TPA demonstration'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        Claim.objects.all().delete()
        EnrollmentMember.objects.all().delete()
        PayrollDeduction.objects.all().delete()
        CarrierInvoice.objects.all().delete()
        Enrollment.objects.all().delete()
        Dependent.objects.all().delete()
        Employee.objects.all().delete()
        PremiumAllocation.objects.all().delete()
        BenefitPlan.objects.all().delete()
        BenefitProduct.objects.all().delete()
        Employer.objects.all().delete()
        Vendor.objects.all().delete()
        Association.objects.all().delete()
        AuditLog.objects.all().delete()
        EligibilityRecord.objects.all().delete()
        CobraEvent.objects.all().delete()
        OpenEnrollmentPeriod.objects.all().delete()
        Document.objects.all().delete()
        Notification.objects.all().delete()
        Message.objects.all().delete()
        LifeEvent.objects.all().delete()
        Reimbursement.objects.all().delete()
        Payment.objects.all().delete()

        self.stdout.write('Creating associations...')
        ar_chamber = Association.objects.create(
            name='Arkansas State Chamber of Commerce',
            association_type='chamber',
            contact_name='Patricia Wells',
            contact_email='pwells@archamber.example.com',
            contact_phone='501-555-9000',
            address='1200 W Capitol Ave\nLittle Rock, AR 72201',
        )
        nwa_mfg = Association.objects.create(
            name='Northwest Arkansas Manufacturers Alliance',
            association_type='trade',
            contact_name='Kenneth Marsh',
            contact_email='kmarsh@nwamfg.example.com',
            contact_phone='479-555-9100',
            address='300 SE 14th St\nBentonville, AR 72712',
        )

        self.stdout.write('Creating vendors...')
        bcbs = Vendor.objects.create(
            name='Blue Cross Blue Shield of Arkansas',
            vendor_type='carrier',
            contact_name='Sarah Mitchell',
            contact_email='sarah.mitchell@bcbsar.example.com',
            contact_phone='501-555-0101',
        )
        delta_dental = Vendor.objects.create(
            name='Delta Dental of Arkansas',
            vendor_type='carrier',
            contact_name='James Parker',
            contact_email='james.parker@deltadentalar.example.com',
            contact_phone='501-555-0202',
        )
        vsp = Vendor.objects.create(
            name='VSP Vision Care',
            vendor_type='carrier',
            contact_name='Linda Chen',
            contact_email='linda.chen@vsp.example.com',
            contact_phone='800-555-0303',
        )
        unum = Vendor.objects.create(
            name='Unum Life Insurance',
            vendor_type='carrier',
            contact_name='Robert Davis',
            contact_email='robert.davis@unum.example.com',
            contact_phone='800-555-0404',
        )
        ppa_admin = Vendor.objects.create(
            name='PPA Administration',
            vendor_type='tpa',
            contact_name='Summit TPA',
            contact_email='admin@summittpa.example.com',
            contact_phone='501-555-0500',
        )
        broker_summit = Vendor.objects.create(
            name='Greg Patterson',
            vendor_type='broker',
            agency='Summit Benefits Group',
            contact_email='greg@summitbenefits.example.com',
            contact_phone='501-555-8000',
            license_number='AR-INS-44821',
            license_state='AR',
            commission_rate=Decimal('5.00'),
        )
        broker_delta = Vendor.objects.create(
            name='Angela Rivera',
            vendor_type='broker',
            agency='Delta Insurance Advisors',
            contact_email='angela@deltainsurance.example.com',
            contact_phone='870-555-8100',
            license_number='AR-INS-55932',
            license_state='AR',
            commission_rate=Decimal('5.00'),
        )

        self.stdout.write('Creating employers...')
        ozark = Employer.objects.create(
            name='Ozark Manufacturing Co.',
            ein='71-1234567',
            address='1200 Industrial Blvd\nLittle Rock, AR 72201',
            contact_name='Tom Henderson',
            contact_email='tom@ozarkmfg.example.com',
            contact_phone='501-555-1000',
            association=ar_chamber,
            billing_cycle_day=1,
        )
        razorback = Employer.objects.create(
            name='Razorback Tech Solutions',
            ein='71-2345678',
            address='450 Innovation Dr\nFayetteville, AR 72701',
            contact_name='Maria Gonzalez',
            contact_email='maria@razorbacktech.example.com',
            contact_phone='479-555-2000',
            association=nwa_mfg,
            billing_cycle_day=15,
        )
        natural = Employer.objects.create(
            name='Natural State Logistics',
            ein='71-3456789',
            address='890 Commerce Way\nJonesboro, AR 72401',
            contact_name='David Kim',
            contact_email='david@naturalstatelogistics.example.com',
            contact_phone='870-555-3000',
            association=ar_chamber,
            billing_cycle_day=1,
        )
        diamond = Employer.objects.create(
            name='Diamond City Dental Group',
            ein='71-4567890',
            address='2100 Cantrell Rd\nLittle Rock, AR 72202',
            contact_name='Dr. Rachel Foster',
            contact_email='rfoster@diamondcitydental.example.com',
            contact_phone='501-555-4000',
            association=ar_chamber,
            billing_cycle_day=1,
        )
        buffalo = Employer.objects.create(
            name='Buffalo River Outfitters',
            ein='71-5678901',
            address='45 Scenic Hwy\nHarrison, AR 72601',
            contact_name='Jake Morrison',
            contact_email='jake@buffaloriver.example.com',
            contact_phone='870-555-5000',
            association=nwa_mfg,
            billing_cycle_day=15,
        )

        self.stdout.write('Creating benefit products and tiers with allocations...')
        today = date.today()
        jan1 = date(today.year, 1, 1)

        employer_broker = {
            ozark.id: broker_summit,
            razorback.id: broker_summit,
            natural.id: broker_delta,
            diamond.id: broker_delta,
            buffalo.id: broker_summit,
        }

        plans = {}
        for employer in [ozark, razorback, natural, diamond, buffalo]:
            plans[employer.id] = {}
            broker = employer_broker[employer.id]

            # Medical product
            med_product = BenefitProduct.objects.create(
                employer=employer,
                name='BCBS PPO',
                plan_type='medical',
                effective_date=jan1,
            )
            for tier, med_carrier, admin_fee, broker_fee in [
                ('employee_only', 580, 40, 30),
                ('employee_spouse', 1200, 80, 70),
                ('family', 1600, 110, 90),
            ]:
                p = BenefitPlan.objects.create(
                    product=med_product,
                    tier=tier,
                    employer_contribution=Decimal(str(round(med_carrier * 0.8))),
                    employee_deduction=Decimal(str(round((med_carrier + admin_fee + broker_fee) - round(med_carrier * 0.8)))),
                )
                PremiumAllocation.objects.create(plan=p, vendor=bcbs, label='Carrier Premium', amount=Decimal(str(med_carrier)))
                PremiumAllocation.objects.create(plan=p, vendor=ppa_admin, label='TPA Admin Fee', amount=Decimal(str(admin_fee)))
                PremiumAllocation.objects.create(plan=p, vendor=broker, label='Broker Fee', amount=Decimal(str(broker_fee)))
                plans[employer.id][f'medical_{tier}'] = p

            # Dental product
            dental_product = BenefitProduct.objects.create(
                employer=employer,
                name='Delta Dental PPO',
                plan_type='dental',
                effective_date=jan1,
            )
            for tier, dental_carrier, admin_fee, broker_fee in [
                ('employee_only', 35, 5, 5),
                ('family', 95, 13, 12),
            ]:
                p = BenefitPlan.objects.create(
                    product=dental_product,
                    tier=tier,
                    employer_contribution=Decimal(str(round(dental_carrier * 0.8))),
                    employee_deduction=Decimal(str(round((dental_carrier + admin_fee + broker_fee) - round(dental_carrier * 0.8)))),
                )
                PremiumAllocation.objects.create(plan=p, vendor=delta_dental, label='Carrier Premium', amount=Decimal(str(dental_carrier)))
                PremiumAllocation.objects.create(plan=p, vendor=ppa_admin, label='TPA Admin Fee', amount=Decimal(str(admin_fee)))
                PremiumAllocation.objects.create(plan=p, vendor=broker, label='Broker Fee', amount=Decimal(str(broker_fee)))
                plans[employer.id][f'dental_{tier}'] = p

            # Vision product
            vision_product = BenefitProduct.objects.create(
                employer=employer,
                name='VSP Vision',
                plan_type='vision',
                effective_date=jan1,
            )
            p = BenefitPlan.objects.create(
                product=vision_product,
                tier='employee_only',
                employer_contribution=Decimal('18'),
                employee_deduction=Decimal('0'),
            )
            PremiumAllocation.objects.create(plan=p, vendor=vsp, label='Carrier Premium', amount=Decimal('15'))
            PremiumAllocation.objects.create(plan=p, vendor=ppa_admin, label='TPA Admin Fee', amount=Decimal('3'))
            plans[employer.id]['vision_employee_only'] = p

            # Life product
            life_product = BenefitProduct.objects.create(
                employer=employer,
                name='Unum Basic Life - $50k',
                plan_type='life',
                effective_date=jan1,
            )
            p = BenefitPlan.objects.create(
                product=life_product,
                tier='employee_only',
                employer_contribution=Decimal('12'),
                employee_deduction=Decimal('0'),
            )
            PremiumAllocation.objects.create(plan=p, vendor=unum, label='Carrier Premium', amount=Decimal('10'))
            PremiumAllocation.objects.create(plan=p, vendor=ppa_admin, label='TPA Admin Fee', amount=Decimal('2'))
            plans[employer.id]['life_employee_only'] = p

        self.stdout.write('Creating employees and enrollments...')
        employees_data = [
            (ozark, 'John', 'Williams', 'john.w@ozarkmfg.example.com', '1985-03-15', '4521', '2020-06-01', 'active', 'full_time', 'Plant Manager', 'Operations', 'Building A', 82000, 40),
            (ozark, 'Lisa', 'Thompson', 'lisa.t@ozarkmfg.example.com', '1990-08-22', '7832', '2021-02-15', 'active', 'full_time', 'Quality Inspector', 'Quality', 'Building A', 54000, 40),
            (ozark, 'Michael', 'Brown', 'michael.b@ozarkmfg.example.com', '1978-12-01', '1456', '2019-09-01', 'active', 'full_time', 'CNC Operator', 'Production', 'Building B', 58000, 40),
            (ozark, 'Sarah', 'Davis', 'sarah.d@ozarkmfg.example.com', '1992-05-10', '9023', '2022-01-10', 'active', 'full_time', 'HR Coordinator', 'Human Resources', 'Main Office', 48000, 40),
            (ozark, 'Robert', 'Wilson', 'robert.w@ozarkmfg.example.com', '1988-11-30', '3367', '2023-04-01', 'active', 'full_time', 'Welder', 'Production', 'Building B', 52000, 40),
            (ozark, 'Jennifer', 'Martinez', 'jennifer.m@ozarkmfg.example.com', '1995-07-18', '5544', '2023-08-15', 'active', 'part_time', 'Receptionist', 'Administration', 'Main Office', 28000, 24),
            (ozark, 'William', 'Anderson', 'william.a@ozarkmfg.example.com', '1982-01-25', '8891', '2018-03-01', 'terminated', 'full_time', 'Forklift Operator', 'Warehouse', 'Building C', 45000, 40),
            (razorback, 'Emily', 'Johnson', 'emily.j@razorbacktech.example.com', '1993-04-20', '2211', '2021-07-01', 'active', 'full_time', 'Software Engineer', 'Engineering', 'Downtown Office', 95000, 40),
            (razorback, 'Daniel', 'Garcia', 'daniel.g@razorbacktech.example.com', '1987-09-14', '6677', '2020-01-15', 'active', 'full_time', 'DevOps Lead', 'Engineering', 'Downtown Office', 105000, 40),
            (razorback, 'Ashley', 'Rodriguez', 'ashley.r@razorbacktech.example.com', '1991-02-28', '4433', '2022-06-01', 'active', 'full_time', 'UX Designer', 'Product', 'Downtown Office', 78000, 40),
            (razorback, 'Christopher', 'Lee', 'chris.l@razorbacktech.example.com', '1989-06-05', '8855', '2021-11-01', 'active', 'full_time', 'QA Engineer', 'Engineering', 'Downtown Office', 72000, 40),
            (razorback, 'Amanda', 'Taylor', 'amanda.t@razorbacktech.example.com', '1996-10-12', '1199', '2024-01-15', 'active', 'temporary', 'Intern', 'Engineering', 'Downtown Office', 38000, 40),
            (natural, 'James', 'Moore', 'james.m@nsl.example.com', '1984-07-08', '3322', '2020-03-01', 'active', 'full_time', 'Fleet Manager', 'Logistics', 'Distribution Center', 68000, 40),
            (natural, 'Jessica', 'Jackson', 'jessica.j@nsl.example.com', '1990-01-17', '7744', '2021-05-15', 'active', 'full_time', 'Dispatcher', 'Logistics', 'Distribution Center', 46000, 40),
            (natural, 'Brandon', 'White', 'brandon.w@nsl.example.com', '1986-11-23', '5566', '2019-08-01', 'active', 'full_time', 'CDL Driver', 'Delivery', 'Distribution Center', 55000, 45),
            (natural, 'Rachel', 'Harris', 'rachel.h@nsl.example.com', '1994-03-30', '9988', '2023-02-01', 'active', 'seasonal', 'Warehouse Associate', 'Warehouse', 'Distribution Center', 35000, 32),
            (diamond, 'Monica', 'Chen', 'monica.c@diamondcity.example.com', '1988-09-12', '2244', '2021-03-01', 'active', 'full_time', 'Dental Hygienist', 'Clinical', 'Main Clinic', 72000, 36),
            (diamond, 'Tyler', 'Brooks', 'tyler.b@diamondcity.example.com', '1992-06-25', '6688', '2022-08-15', 'active', 'full_time', 'Office Manager', 'Administration', 'Main Clinic', 52000, 40),
            (diamond, 'Samantha', 'Reed', 'samantha.r@diamondcity.example.com', '1995-11-08', '3311', '2023-01-10', 'active', 'part_time', 'Dental Assistant', 'Clinical', 'Main Clinic', 32000, 24),
            (diamond, 'Kevin', 'Foster', 'kevin.f@diamondcity.example.com', '1983-04-17', '7799', '2020-06-01', 'active', 'full_time', 'Dentist', 'Clinical', 'Main Clinic', 145000, 40),
            (buffalo, 'Nathan', 'Price', 'nathan.p@buffaloriver.example.com', '1991-02-14', '4455', '2022-04-01', 'active', 'full_time', 'Guide Supervisor', 'Operations', 'River Base', 48000, 40),
            (buffalo, 'Lauren', 'Cooper', 'lauren.c@buffaloriver.example.com', '1987-08-30', '8822', '2021-09-15', 'active', 'full_time', 'Marketing Manager', 'Marketing', 'Main Office', 62000, 40),
            (buffalo, 'Derek', 'Hughes', 'derek.h@buffaloriver.example.com', '1994-12-03', '1177', '2023-06-01', 'active', 'seasonal', 'River Guide', 'Operations', 'River Base', 32000, 30),
        ]

        enrollment_configs = {
            'John Williams': [('medical_family', 'carrier_confirmed'), ('dental_family', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Lisa Thompson': [('medical_employee_only', 'active'), ('dental_employee_only', 'active'), ('life_employee_only', 'active')],
            'Michael Brown': [('medical_employee_spouse', 'carrier_confirmed'), ('dental_family', 'carrier_confirmed'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Sarah Davis': [('medical_employee_only', 'pending')],
            'Robert Wilson': [('medical_employee_only', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Jennifer Martinez': [('medical_employee_only', 'pending'), ('dental_employee_only', 'pending')],
            'Emily Johnson': [('medical_family', 'active'), ('dental_family', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Daniel Garcia': [('medical_employee_spouse', 'carrier_confirmed'), ('dental_employee_only', 'active'), ('life_employee_only', 'active')],
            'Ashley Rodriguez': [('medical_employee_only', 'active'), ('dental_employee_only', 'active'), ('life_employee_only', 'active')],
            'Christopher Lee': [('medical_employee_spouse', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Amanda Taylor': [('medical_employee_only', 'pending')],
            'James Moore': [('medical_family', 'carrier_confirmed'), ('dental_family', 'active'), ('life_employee_only', 'active')],
            'Jessica Jackson': [('medical_employee_only', 'active'), ('dental_employee_only', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Brandon White': [('medical_employee_spouse', 'active'), ('life_employee_only', 'active')],
            'Rachel Harris': [('medical_employee_only', 'pending'), ('dental_employee_only', 'pending')],
            'Monica Chen': [('medical_employee_spouse', 'active'), ('dental_employee_only', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Tyler Brooks': [('medical_employee_only', 'active'), ('dental_employee_only', 'active'), ('life_employee_only', 'active')],
            'Samantha Reed': [('medical_employee_only', 'pending'), ('dental_employee_only', 'pending')],
            'Kevin Foster': [('medical_family', 'carrier_confirmed'), ('dental_family', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Nathan Price': [('medical_employee_only', 'active'), ('dental_employee_only', 'active'), ('life_employee_only', 'active')],
            'Lauren Cooper': [('medical_employee_spouse', 'active'), ('dental_family', 'active'), ('vision_employee_only', 'active'), ('life_employee_only', 'active')],
            'Derek Hughes': [('medical_employee_only', 'pending')],
        }

        for emp_data in employees_data:
            employer, first, last, email, dob, ssn4, hire, status, emp_class, title, dept, location, salary, hours = emp_data
            term_date = date(today.year, 6, 30) if status == 'terminated' else None
            emp = Employee.objects.create(
                employer=employer,
                first_name=first,
                last_name=last,
                email=email,
                date_of_birth=date.fromisoformat(dob),
                ssn_last_four=ssn4,
                hire_date=date.fromisoformat(hire),
                termination_date=term_date,
                status=status,
                employment_class=emp_class,
                job_title=title,
                department=dept,
                work_location=location,
                annual_salary=Decimal(str(salary)),
                hours_per_week=hours,
            )

            full_name = f"{first} {last}"
            if full_name in enrollment_configs:
                for plan_key, enroll_status in enrollment_configs[full_name]:
                    plan = plans[employer.id][plan_key]
                    conf_num = ''
                    conf_at = None
                    if enroll_status == 'carrier_confirmed':
                        conf_num = f"CONF-{emp.id:06d}"
                        conf_at = today - timedelta(days=5)
                    Enrollment.objects.create(
                        employee=emp,
                        plan=plan,
                        status=enroll_status,
                        effective_date=jan1,
                        carrier_confirmation_number=conf_num,
                        carrier_confirmed_at=conf_at,
                    )

        self.stdout.write('Creating dependents...')
        dependents_data = {
            'John Williams': [
                ('Karen', 'Williams', '1987-06-20', '4522', 'female', 'spouse'),
                ('Ethan', 'Williams', '2015-09-10', '4523', 'male', 'child'),
                ('Olivia', 'Williams', '2018-03-25', '4524', 'female', 'child'),
            ],
            'Michael Brown': [
                ('Stephanie', 'Brown', '1980-04-12', '1457', 'female', 'spouse'),
                ('Jacob', 'Brown', '2010-11-03', '1458', 'male', 'child'),
            ],
            'Emily Johnson': [
                ('Ryan', 'Johnson', '1991-12-08', '2212', 'male', 'spouse'),
                ('Sophia', 'Johnson', '2020-07-14', '2213', 'female', 'child'),
            ],
            'Daniel Garcia': [
                ('Maria', 'Garcia', '1989-03-22', '6678', 'female', 'spouse'),
            ],
            'Christopher Lee': [
                ('Amy', 'Lee', '1990-08-15', '8856', 'female', 'spouse'),
            ],
            'James Moore': [
                ('Patricia', 'Moore', '1986-02-28', '3323', 'female', 'spouse'),
                ('Noah', 'Moore', '2016-05-19', '3324', 'male', 'child'),
            ],
            'Brandon White': [
                ('Heather', 'White', '1988-10-07', '5567', 'female', 'spouse'),
            ],
            'Monica Chen': [
                ('David', 'Chen', '1986-07-30', '2245', 'male', 'spouse'),
            ],
            'Kevin Foster': [
                ('Laura', 'Foster', '1985-01-14', '7700', 'female', 'spouse'),
                ('Emma', 'Foster', '2013-08-22', '7701', 'female', 'child'),
                ('Liam', 'Foster', '2017-04-05', '7702', 'male', 'child'),
            ],
            'Lauren Cooper': [
                ('Mark', 'Cooper', '1985-11-20', '8823', 'male', 'spouse'),
                ('Ava', 'Cooper', '2019-01-30', '8824', 'female', 'child'),
            ],
        }

        employee_objs = {}
        for emp in Employee.objects.all():
            employee_objs[emp.full_name] = emp

        dependent_objs = {}
        for emp_name, deps in dependents_data.items():
            emp = employee_objs.get(emp_name)
            if not emp:
                continue
            dependent_objs[emp_name] = []
            for first, last, dob, ssn4, gender, rel in deps:
                dep = Dependent.objects.create(
                    employee=emp,
                    first_name=first,
                    last_name=last,
                    date_of_birth=date.fromisoformat(dob),
                    ssn_last_four=ssn4,
                    gender=gender,
                    relationship=rel,
                )
                dependent_objs[emp_name].append(dep)

        self.stdout.write('Creating enrollment members...')
        for enrollment in Enrollment.objects.select_related('employee', 'plan').all():
            EnrollmentMember.objects.create(
                enrollment=enrollment,
                is_subscriber=True,
                effective_date=enrollment.effective_date,
            )
            tier = enrollment.plan.tier
            emp_name = enrollment.employee.full_name
            deps = dependent_objs.get(emp_name, [])
            if tier == 'family':
                for dep in deps:
                    EnrollmentMember.objects.create(
                        enrollment=enrollment,
                        dependent=dep,
                        effective_date=enrollment.effective_date,
                    )
            elif tier == 'employee_spouse':
                spouse = next((d for d in deps if d.relationship == 'spouse'), None)
                if spouse:
                    EnrollmentMember.objects.create(
                        enrollment=enrollment,
                        dependent=spouse,
                        effective_date=enrollment.effective_date,
                    )

        self.stdout.write('Creating carrier invoices...')
        last_month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        last_month_end = today.replace(day=1) - timedelta(days=1)

        for employer in [ozark, razorback, natural, diamond, buffalo]:
            active_medical = Enrollment.objects.filter(
                employee__employer=employer,
                plan__product__plan_type='medical',
                status__in=['active', 'carrier_confirmed'],
            )
            expected = sum(e.plan.monthly_premium for e in active_medical)

            CarrierInvoice.objects.create(
                vendor=bcbs,
                employer=employer,
                invoice_number=f"BCBS-{employer.id}-{last_month_start.strftime('%Y%m')}",
                billing_period_start=last_month_start,
                billing_period_end=last_month_end,
                billed_amount=expected,
                expected_amount=expected,
                received_date=today - timedelta(days=10),
                due_date=today + timedelta(days=20),
            )

            active_dental = Enrollment.objects.filter(
                employee__employer=employer,
                plan__product__plan_type='dental',
                status__in=['active', 'carrier_confirmed'],
            )
            expected_dental = sum(e.plan.monthly_premium for e in active_dental)

            CarrierInvoice.objects.create(
                vendor=delta_dental,
                employer=employer,
                invoice_number=f"DD-{employer.id}-{last_month_start.strftime('%Y%m')}",
                billing_period_start=last_month_start,
                billing_period_end=last_month_end,
                billed_amount=expected_dental,
                expected_amount=expected_dental,
                received_date=today - timedelta(days=8),
                due_date=today + timedelta(days=22),
            )

        CarrierInvoice.objects.create(
            vendor=bcbs,
            employer=ozark,
            invoice_number=f"BCBS-{ozark.id}-{today.strftime('%Y%m')}-ADJ",
            billing_period_start=today.replace(day=1),
            billing_period_end=today,
            billed_amount=Decimal('5250.00'),
            expected_amount=Decimal('4900.00'),
            notes='Billed amount includes terminated employee William Anderson who should have been removed.',
            received_date=today - timedelta(days=2),
            due_date=today + timedelta(days=28),
        )
        CarrierInvoice.objects.create(
            vendor=delta_dental,
            employer=diamond,
            invoice_number=f"DD-{diamond.id}-{today.strftime('%Y%m')}-ADJ",
            billing_period_start=today.replace(day=1),
            billing_period_end=today,
            billed_amount=Decimal('210.00'),
            expected_amount=Decimal('165.00'),
            notes='Carrier billed for employee who waived dental coverage.',
            received_date=today - timedelta(days=3),
            due_date=today + timedelta(days=27),
        )

        self.stdout.write('Creating payroll deductions...')
        period_start = today.replace(day=1)
        if today.month == 12:
            period_end = today.replace(year=today.year + 1, month=1, day=1)
        else:
            period_end = today.replace(month=today.month + 1, day=1)

        for enrollment in Enrollment.objects.filter(status__in=['active', 'carrier_confirmed']):
            PayrollDeduction.objects.create(
                enrollment=enrollment,
                period_start=period_start,
                period_end=period_end,
                amount=enrollment.plan.employee_deduction,
                status='pending',
            )

        self.stdout.write('Creating claims...')
        import random
        random.seed(42)
        staff_names = ['Priya Shah', 'Marcus Bell', 'Dana Okafor', 'Jordan Liu']
        providers = [
            ('Urgent Care Now', 'Urgent care visit', '99213', 'Z00.00', '1234567890'),
            ('Northway Family Health', 'Annual preventive exam', '99396', 'Z00.00', '1902846637'),
            ('Northeast Allergy & Asthma', 'Allergy testing', '95004', 'J30.1', '1456789012'),
            ('Pine Bush Pediatrics', 'Well child visit', '99393', 'Z00.129', '1567890123'),
            ('Clearline Diagnostics', 'Metabolic panel and lipid panel', '80053', 'E78.5', '1678901234'),
            ('Saratoga Dermatology', 'Skin biopsy', '11102', 'L82.1', '1789012345'),
            ('Capital Orthopedics', 'X-ray shoulder', '73030', 'M75.110', '1890123456'),
            ('Little Rock Physical Therapy', 'PT evaluation', '97161', 'M54.5', '1901234567'),
            ('River Valley Radiology', 'MRI lumbar spine', '72148', 'M54.5', '1012345678'),
            ('Bentonville Family Medicine', 'Office visit', '99214', 'J06.9', '1123456789'),
            ('Jonesboro Womens Health', 'OB visit', '99213', 'Z34.90', '1234567801'),
            ('Harrison Eye Care', 'Eye exam', '92014', 'H52.4', '1345678901'),
            ('Baptist Health ER', 'ER visit', '99284', 'R10.9', '1456780123'),
            ('Conway Regional Lab', 'CBC and CMP', '85025', 'R53.83', '1567801234'),
            ('Fayetteville Surgical Associates', 'Surgical consultation', '99244', 'K40.90', '1678012345'),
        ]
        claim_num = 1000
        active_employees = list(Employee.objects.filter(status='active').select_related('employer'))
        all_deps_by_emp = {}
        for dep in Dependent.objects.select_related('employee').all():
            all_deps_by_emp.setdefault(dep.employee_id, []).append(dep)

        statuses_weights = [
            ('received', 25), ('in_review', 15), ('pending_info', 10),
            ('approved', 8), ('denied', 5), ('paid', 37),
        ]
        status_choices = [s for s, _ in statuses_weights]
        status_weights = [w for _, w in statuses_weights]

        pending_reasons = [
            'Medical records needed', 'Coordination of benefits',
            'Other coverage (coordination of benefits)',
            'Pre-authorization verification', 'Itemized bill required',
        ]

        for i in range(120):
            emp = random.choice(active_employees)
            deps = all_deps_by_emp.get(emp.id, [])
            dep = random.choice(deps) if deps and random.random() < 0.35 else None
            prov = random.choice(providers)
            days_ago = random.randint(2, 180)
            service_d = today - timedelta(days=days_ago)
            received_d = service_d + timedelta(days=random.randint(3, 21))
            billed = Decimal(str(round(random.uniform(45, 1200), 2)))
            s = random.choices(status_choices, weights=status_weights, k=1)[0]
            claim_num += 1

            allowed = None
            plan_p = None
            member_o = None
            deductible = None
            paid = None
            pending_r = ''
            assigned = random.choice(staff_names) if s != 'received' or random.random() < 0.5 else ''
            denial = ''

            if s in ('approved', 'paid'):
                allowed = round(billed * Decimal(str(random.uniform(0.7, 1.0))), 2)
                plan_p = round(allowed * Decimal(str(random.uniform(0.5, 0.9))), 2)
                member_o = allowed - plan_p
                deductible = round(member_o * Decimal(str(random.uniform(0, 1))), 2)
                if s == 'paid':
                    paid = plan_p
            elif s == 'pending_info':
                pending_r = random.choice(pending_reasons)
            elif s == 'denied':
                denial = random.choice([
                    'Service not covered under plan',
                    'Pre-authorization not obtained',
                    'Out of network provider - no OON benefits',
                    'Duplicate claim',
                    'Timely filing limit exceeded',
                ])

            Claim.objects.create(
                claim_number=f'CLM-{claim_num:06d}',
                claim_type=random.choice(['medical', 'medical', 'medical', 'dental', 'vision']),
                employee=emp,
                dependent=dep,
                provider_name=prov[0],
                service_description=prov[1],
                procedure_codes=prov[2],
                diagnosis_codes=prov[3],
                npi=prov[4],
                member_id=f'{emp.ssn_last_four[:2]}KC{emp.id}AJ{emp.employer.name[:3].upper()}',
                received_method=random.choice(['electronic', 'electronic', 'electronic', 'paper', 'portal']),
                service_date=service_d,
                received_date=received_d,
                billed_amount=billed,
                allowed_amount=allowed,
                plan_pays=plan_p,
                member_owes=member_o,
                deductible_applied=deductible,
                paid_amount=paid,
                status=s,
                pending_reason=pending_r,
                assigned_to=assigned,
                denial_reason=denial,
            )

        self.stdout.write('Creating audit log entries...')
        AuditLog.objects.create(
            action='system_init', entity_type='System', entity_id=0,
            description='Demo environment initialized with seed data',
        )
        AuditLog.objects.create(
            action='enrollment_submitted', entity_type='Enrollment', entity_id=1,
            description='Sarah Davis submitted new medical enrollment - pending review',
        )
        AuditLog.objects.create(
            action='carrier_confirm', entity_type='Enrollment', entity_id=2,
            description='BCBS confirmed enrollment for John Williams (family plan)',
        )
        AuditLog.objects.create(
            action='invoice_discrepancy', entity_type='CarrierInvoice', entity_id=1,
            description='Discrepancy found on BCBS invoice for Ozark Manufacturing - $350.00 overbilled (terminated employee)',
        )
        AuditLog.objects.create(
            action='invoice_discrepancy', entity_type='CarrierInvoice', entity_id=2,
            description='Discrepancy found on Delta Dental invoice for Diamond City Dental - $45.00 overbilled (waived coverage)',
        )

        self.stdout.write('Creating payments...')
        employers_list = [ozark, razorback, natural, diamond, buffalo]
        for employer in employers_list:
            emp_enrollments = Enrollment.objects.filter(
                employee__employer=employer,
                status__in=['active', 'carrier_confirmed'],
            ).select_related('plan')
            monthly_total = sum(e.plan.monthly_premium for e in emp_enrollments)
            for months_ago in [3, 2, 1]:
                pay_date = today - timedelta(days=months_ago * 30)
                pstart = pay_date.replace(day=1)
                if pstart.month == 12:
                    pend = pstart.replace(year=pstart.year + 1, month=1, day=1)
                else:
                    pend = pstart.replace(month=pstart.month + 1, day=1)
                Payment.objects.create(
                    employer=employer,
                    amount=monthly_total,
                    payment_date=pay_date,
                    payment_method=random.choice(['ach', 'ach', 'check']),
                    reference_number=f"PAY-{employer.id}-{pay_date.strftime('%Y%m')}",
                    period_start=pstart,
                    period_end=pend,
                    status='applied',
                )
            pstart = today.replace(day=1)
            if pstart.month == 12:
                pend = pstart.replace(year=pstart.year + 1, month=1, day=1)
            else:
                pend = pstart.replace(month=pstart.month + 1, day=1)
            Payment.objects.create(
                employer=employer,
                amount=monthly_total,
                payment_date=today - timedelta(days=2),
                payment_method='ach',
                reference_number=f"PAY-{employer.id}-{today.strftime('%Y%m')}",
                period_start=pstart,
                period_end=pend,
                status=random.choice(['received', 'pending']),
            )

        self.stdout.write('Creating messages...')
        all_employees = list(Employee.objects.all())
        messages_data = [
            (all_employees[0], 'inbound', 'portal', 'Question about dental coverage', 'Hi, I wanted to check if orthodontics is covered under my dental plan for my daughter.', 'John Williams', 'unread', 'benefits'),
            (all_employees[1], 'inbound', 'email', 'Need new insurance cards', 'I lost my insurance cards and need replacements.', 'Lisa Thompson', 'read', 'general'),
            (all_employees[3], 'inbound', 'portal', 'Enrollment status question', 'I submitted my enrollment forms two weeks ago but still show as pending.', 'Sarah Davis', 'replied', 'enrollment'),
            (all_employees[7], 'outbound', 'email', 'Open enrollment reminder', 'This is a reminder that open enrollment ends on December 15th.', 'Summit TPA', 'closed', 'enrollment'),
            (all_employees[4], 'inbound', 'phone', 'Claim denied - need explanation', 'I received an EOB showing my physical therapy claim was denied.', 'Robert Wilson', 'unread', 'claims'),
            (all_employees[8], 'inbound', 'portal', 'Adding spouse to plan', 'I got married last month and need to add my spouse to my medical and dental plans.', 'Ashley Rodriguez', 'unread', 'enrollment'),
        ]
        for emp, direction, channel, subject, body, sender, status, category in messages_data:
            Message.objects.create(
                employee=emp, direction=direction, channel=channel,
                subject=subject, body=body, sender_name=sender,
                status=status, category=category,
                assigned_to=random.choice(staff_names) if status in ('unread', 'read') else '',
            )

        self.stdout.write('Creating life events...')
        life_events_data = [
            (all_employees[8], 'marriage', today - timedelta(days=25), 'Married on October 1st. Need to add spouse.', 'pending', False, None),
            (all_employees[0], 'birth', today - timedelta(days=60), 'New baby girl born. Adding as dependent.', 'completed', True, today - timedelta(days=55)),
            (all_employees[7], 'loss_coverage', today - timedelta(days=15), 'Spouse lost coverage. Need to add spouse to my plan.', 'approved', True, today - timedelta(days=10)),
        ]
        for emp, event_type, event_date, desc, status, docs, eff_date in life_events_data:
            LifeEvent.objects.create(
                employee=emp, event_type=event_type, event_date=event_date,
                description=desc, status=status, documentation_received=docs,
                effective_date=eff_date,
                reviewed_by=random.choice(staff_names) if status in ('approved', 'completed') else '',
            )

        self.stdout.write('Creating reimbursements...')
        reimbursements_data = [
            (all_employees[0], 'hra', Decimal('250.00'), Decimal('250.00'), today - timedelta(days=20), 'Annual eye exam and glasses', 'vision', True, 'paid', today - timedelta(days=10)),
            (all_employees[7], 'fsa', Decimal('125.00'), Decimal('125.00'), today - timedelta(days=15), 'Prescription medications', 'prescription', True, 'approved', None),
            (all_employees[2], 'hra', Decimal('450.00'), None, today - timedelta(days=5), 'Physical therapy copays', 'medical', False, 'submitted', None),
        ]
        for emp, rtype, amt_req, amt_app, exp_date, desc, cat, receipt, status, paid_date in reimbursements_data:
            Reimbursement.objects.create(
                employee=emp, reimbursement_type=rtype,
                amount_requested=amt_req, amount_approved=amt_app,
                expense_date=exp_date, description=desc,
                category=cat, receipt_received=receipt, status=status,
                paid_date=paid_date,
                reviewed_by=random.choice(staff_names) if status in ('approved', 'paid', 'in_review', 'denied') else '',
            )

        self.stdout.write('Creating eligibility records...')
        eligibility_data = [
            ('834_initial', 'outbound', 'sent', 'TXN-2026-001'),
            ('834_initial', 'outbound', 'accepted', 'TXN-2026-002'),
            ('834_change', 'outbound', 'accepted', 'TXN-2026-003'),
            ('834_change', 'outbound', 'pending', ''),
            ('834_term', 'outbound', 'sent', 'TXN-2026-005'),
            ('834_initial', 'outbound', 'rejected', 'TXN-2026-006'),
        ]
        all_enrollments = list(Enrollment.objects.select_related('employee', 'plan', 'plan__product').all())
        for i, (ftype, direction, status, txn_id) in enumerate(eligibility_data):
            enrollment = all_enrollments[i % len(all_enrollments)]
            carrier_vendor = enrollment.plan.allocations.filter(vendor__vendor_type='carrier').first()
            error_msg = ''
            if status == 'rejected':
                error_msg = 'Member ID not found in carrier system.'
            EligibilityRecord.objects.create(
                employee=enrollment.employee,
                vendor=carrier_vendor.vendor if carrier_vendor else bcbs,
                plan=enrollment.plan,
                file_type=ftype,
                direction=direction,
                status=status,
                transaction_id=txn_id,
                error_message=error_msg,
                member_count=1 if ftype != '834_initial' else enrollment.members.count() or 1,
                effective_date=enrollment.effective_date,
            )

        self.stdout.write('Creating COBRA events...')
        cobra_data = [
            (2, 0, 'termination', today - timedelta(days=45), 'elected', 'current', Decimal('850.00')),
            (5, 1, 'hours_reduction', today - timedelta(days=30), 'pending', 'na', Decimal('620.00')),
            (8, 2, 'divorce', today - timedelta(days=90), 'elected', 'current', Decimal('1100.00')),
        ]
        for emp_idx, emp_grp, event, evt_date, election, payment, premium in cobra_data:
            emp = all_employees[emp_idx % len(all_employees)]
            employer = employers_list[emp_grp % len(employers_list)]
            election_deadline = evt_date + timedelta(days=60)
            cov_start = evt_date + timedelta(days=1) if election == 'elected' else None
            cov_end = cov_start + timedelta(days=547) if cov_start else None
            CobraEvent.objects.create(
                employee=emp,
                employer=employer,
                qualifying_event=event,
                event_date=evt_date,
                election_deadline=election_deadline,
                election_status=election,
                coverage_start=cov_start,
                coverage_end=cov_end,
                monthly_premium=premium,
                admin_fee_pct=Decimal('2.00'),
                payment_status=payment,
                qualified_beneficiaries=2 if event in ('divorce', 'death') else 1,
            )

        self.stdout.write('Creating open enrollment periods...')
        oe_data = [
            ('2026 Annual Open Enrollment', '2026-01-01', '2026-12-31', '2025-11-01', '2025-11-30', 'completed', 6, 5, 1),
            ('2027 Annual Open Enrollment', '2027-01-01', '2027-12-31', '2026-11-01', '2026-11-30', 'upcoming', 7, 0, 0),
        ]
        all_employers = list(Employer.objects.all())
        for i, (name, pys, pye, es, ee, status, elig, enrolled, waived) in enumerate(oe_data):
            OpenEnrollmentPeriod.objects.create(
                employer=all_employers[i % len(all_employers)],
                name=name,
                plan_year_start=date.fromisoformat(pys),
                plan_year_end=date.fromisoformat(pye),
                enrollment_start=date.fromisoformat(es),
                enrollment_end=date.fromisoformat(ee),
                status=status,
                eligible_employees=elig,
                enrolled_employees=enrolled,
                waived_employees=waived,
            )

        self.stdout.write('Creating documents...')
        doc_data = [
            ('BCBS PPO Plan Document 2026', 'plan_document', 0, 'BCBS_PPO_Plan_2026.pdf', 2450000),
            ('Delta Dental SPD', 'spd', 1, 'Delta_Dental_SPD_2026.pdf', 1800000),
            ('VSP Vision SBC', 'sbc', 2, 'VSP_Vision_SBC.pdf', 950000),
            ('Q3 2026 Census Report', 'census', 0, 'Census_Q3_2026.xlsx', 450000),
            ('COBRA Election Notice Template', 'cobra_notice', None, 'COBRA_Election_Notice.pdf', 380000),
        ]
        for title, dtype, emp_idx, fname, fsize in doc_data:
            employer = all_employers[emp_idx] if emp_idx is not None else None
            Document.objects.create(
                title=title,
                document_type=dtype,
                employer=employer,
                file_name=fname,
                file_size=fsize,
                uploaded_by='Admin',
                status='active',
                effective_date=date(2026, 1, 1),
            )

        self.stdout.write('Creating notifications...')
        notif_data = [
            ('Invoice discrepancy detected', 'BCBS invoice has a $352 discrepancy. Review and resolve.', 'warning', 'billing', True, 'Review Invoice', '/staff/invoices'),
            ('Open enrollment period starting', '2027 open enrollment for Natural State Logistics begins Oct 15.', 'info', 'enrollment', True, 'View OE', '/staff/open-enrollment'),
            ('834 file rejected by carrier', 'Eligibility file TXN-2026-006 was rejected by BCBS.', 'urgent', 'eligibility', True, 'View Details', '/staff/eligibility'),
            ('3 unread employee messages', 'There are 3 unread messages from employees awaiting response.', 'info', 'system', True, 'View Messages', '/staff/messages'),
        ]
        for title, msg, ntype, cat, actionable, alabel, aurl in notif_data:
            Notification.objects.create(
                title=title,
                message=msg,
                notification_type=ntype,
                category=cat,
                is_actionable=actionable,
                action_label=alabel,
                action_url=aurl,
            )

        total_employees = Employee.objects.count()
        total_enrollments = Enrollment.objects.count()
        total_members = EnrollmentMember.objects.count()
        total_claims = Claim.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Done! {Association.objects.count()} associations, '
            f'{Vendor.objects.count()} vendors, '
            f'{Employer.objects.count()} employers, '
            f'{total_employees} employees, '
            f'{Dependent.objects.count()} dependents, '
            f'{total_enrollments} enrollments, '
            f'{total_members} enrollment members, '
            f'{PremiumAllocation.objects.count()} premium allocations, '
            f'{total_claims} claims, '
            f'{CarrierInvoice.objects.count()} invoices, '
            f'{Payment.objects.count()} payments'
        ))
