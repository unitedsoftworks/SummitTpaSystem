import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PortalSelect from './pages/PortalSelect';
import Dashboard from './pages/Dashboard';
import Employers from './pages/Employers';
import EmployerDetail from './pages/EmployerDetail';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Enrollments from './pages/Enrollments';
import Deductions from './pages/Deductions';
import Invoices from './pages/Invoices';
import Carriers from './pages/Carriers';
import AuditLog from './pages/AuditLog';
import EmployerPortal from './pages/EmployerPortal';
import EmployeePortal from './pages/EmployeePortal';
import BrokerPortal from './pages/BrokerPortal';
import EnrollmentEdit from './pages/EnrollmentEdit';
import Claims from './pages/Claims';
import ClaimDetail from './pages/ClaimDetail';
import Messages from './pages/Messages';
import LifeEvents from './pages/LifeEvents';
import Reimbursements from './pages/Reimbursements';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import CarrierDetail from './pages/CarrierDetail';
import Eligibility from './pages/Eligibility';
import CobraAdmin from './pages/CobraAdmin';
import OpenEnrollment from './pages/OpenEnrollment';
import Documents from './pages/Documents';
import Notifications from './pages/Notifications';
import Compliance from './pages/Compliance';
import Plans from './pages/Plans';
import AssociationPortal from './pages/AssociationPortal';
import Payments from './pages/Payments';
import Dependents from './pages/Dependents';
import Associations from './pages/Associations';
import EmployerInvoices from './pages/EmployerInvoices';
import Exceptions from './pages/Exceptions';
import NewEnrollment from './pages/NewEnrollment';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalSelect />} />

        {/* Staff Portal */}
        <Route path="/staff" element={<Layout portal="staff"><Dashboard /></Layout>} />
        <Route path="/staff/employers" element={<Layout portal="staff"><Employers /></Layout>} />
        <Route path="/staff/employers/:id" element={<Layout portal="staff"><EmployerDetail /></Layout>} />
        <Route path="/staff/employees" element={<Layout portal="staff"><Employees /></Layout>} />
        <Route path="/staff/employees/:id" element={<Layout portal="staff"><EmployeeDetail /></Layout>} />
        <Route path="/staff/employees/:id/new-coverage" element={<Layout portal="staff"><NewEnrollment /></Layout>} />
        <Route path="/staff/enrollments" element={<Layout portal="staff"><Enrollments /></Layout>} />
        <Route path="/staff/enrollments/:id" element={<Layout portal="staff"><EnrollmentEdit /></Layout>} />
        <Route path="/staff/claims" element={<Layout portal="staff"><Claims /></Layout>} />
        <Route path="/staff/claims/:id" element={<Layout portal="staff"><ClaimDetail /></Layout>} />
        <Route path="/staff/messages" element={<Layout portal="staff"><Messages /></Layout>} />
        <Route path="/staff/life-events" element={<Layout portal="staff"><LifeEvents /></Layout>} />
        <Route path="/staff/reimbursements" element={<Layout portal="staff"><Reimbursements /></Layout>} />
        <Route path="/staff/finance" element={<Layout portal="staff"><Finance /></Layout>} />
        <Route path="/staff/reports" element={<Layout portal="staff"><Reports /></Layout>} />
        <Route path="/staff/deductions" element={<Layout portal="staff"><Deductions /></Layout>} />
        <Route path="/staff/invoices" element={<Layout portal="staff"><Invoices /></Layout>} />
        <Route path="/staff/eligibility" element={<Layout portal="staff"><Eligibility /></Layout>} />
        <Route path="/staff/cobra" element={<Layout portal="staff"><CobraAdmin /></Layout>} />
        <Route path="/staff/open-enrollment" element={<Layout portal="staff"><OpenEnrollment /></Layout>} />
        <Route path="/staff/documents" element={<Layout portal="staff"><Documents /></Layout>} />
        <Route path="/staff/notifications" element={<Layout portal="staff"><Notifications /></Layout>} />
        <Route path="/staff/carriers" element={<Layout portal="staff"><Carriers /></Layout>} />
        <Route path="/staff/carriers/:id" element={<Layout portal="staff"><CarrierDetail /></Layout>} />
        <Route path="/staff/compliance" element={<Layout portal="staff"><Compliance /></Layout>} />
        <Route path="/staff/plans" element={<Layout portal="staff"><Plans /></Layout>} />
        <Route path="/staff/payments" element={<Layout portal="staff"><Payments /></Layout>} />
        <Route path="/staff/dependents" element={<Layout portal="staff"><Dependents /></Layout>} />
        <Route path="/staff/associations" element={<Layout portal="staff"><Associations /></Layout>} />
        <Route path="/staff/employer-invoices" element={<Layout portal="staff"><EmployerInvoices /></Layout>} />
        <Route path="/staff/exceptions" element={<Layout portal="staff"><Exceptions /></Layout>} />
        <Route path="/staff/audit-log" element={<Layout portal="staff"><AuditLog /></Layout>} />

        {/* Employer Portal */}
        <Route path="/employer" element={<Layout portal="employer"><EmployerPortal /></Layout>} />
        <Route path="/employer/employees" element={<Layout portal="employer"><EmployerPortal section="employees" /></Layout>} />
        <Route path="/employer/enrollments" element={<Layout portal="employer"><EmployerPortal section="enrollments" /></Layout>} />
        <Route path="/employer/invoices" element={<Layout portal="employer"><EmployerPortal section="invoices" /></Layout>} />
        <Route path="/employer/deductions" element={<Layout portal="employer"><EmployerPortal section="deductions" /></Layout>} />

        {/* Employee Portal */}
        <Route path="/employee" element={<Layout portal="employee"><EmployeePortal /></Layout>} />

        {/* Broker Portal */}
        <Route path="/broker" element={<Layout portal="broker"><BrokerPortal /></Layout>} />

        {/* Association Portal */}
        <Route path="/association" element={<Layout portal="staff"><AssociationPortal /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
