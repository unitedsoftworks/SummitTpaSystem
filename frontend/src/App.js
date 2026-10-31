import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfirmProvider } from './components/ConfirmDialog';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import PortalSelect from './pages/PortalSelect';
import Dashboard from './pages/Dashboard';
import Employers from './pages/Employers';
import EmployerDetail from './pages/EmployerDetail';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Enrollments from './pages/Enrollments';
import Deductions from './pages/Deductions';
import Invoices from './pages/Invoices';
import Vendors from './pages/Vendors';
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
import VendorDetail from './pages/VendorDetail';
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

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <ConfirmProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<P><PortalSelect /></P>} />

        {/* Staff Portal */}
        <Route path="/staff" element={<P><Layout portal="staff"><Dashboard /></Layout></P>} />
        <Route path="/staff/employers" element={<P><Layout portal="staff"><Employers /></Layout></P>} />
        <Route path="/staff/employers/:id" element={<P><Layout portal="staff"><EmployerDetail /></Layout></P>} />
        <Route path="/staff/employees" element={<P><Layout portal="staff"><Employees /></Layout></P>} />
        <Route path="/staff/employees/:id" element={<P><Layout portal="staff"><EmployeeDetail /></Layout></P>} />
        <Route path="/staff/employees/:id/new-coverage" element={<P><Layout portal="staff"><NewEnrollment /></Layout></P>} />
        <Route path="/staff/enrollments" element={<P><Layout portal="staff"><Enrollments /></Layout></P>} />
        <Route path="/staff/enrollments/:id" element={<P><Layout portal="staff"><EnrollmentEdit /></Layout></P>} />
        <Route path="/staff/claims" element={<P><Layout portal="staff"><Claims /></Layout></P>} />
        <Route path="/staff/claims/:id" element={<P><Layout portal="staff"><ClaimDetail /></Layout></P>} />
        <Route path="/staff/messages" element={<P><Layout portal="staff"><Messages /></Layout></P>} />
        <Route path="/staff/life-events" element={<P><Layout portal="staff"><LifeEvents /></Layout></P>} />
        <Route path="/staff/reimbursements" element={<P><Layout portal="staff"><Reimbursements /></Layout></P>} />
        <Route path="/staff/finance" element={<P><Layout portal="staff"><Finance /></Layout></P>} />
        <Route path="/staff/reports" element={<P><Layout portal="staff"><Reports /></Layout></P>} />
        <Route path="/staff/deductions" element={<P><Layout portal="staff"><Deductions /></Layout></P>} />
        <Route path="/staff/invoices" element={<P><Layout portal="staff"><Invoices /></Layout></P>} />
        <Route path="/staff/eligibility" element={<P><Layout portal="staff"><Eligibility /></Layout></P>} />
        <Route path="/staff/cobra" element={<P><Layout portal="staff"><CobraAdmin /></Layout></P>} />
        <Route path="/staff/open-enrollment" element={<P><Layout portal="staff"><OpenEnrollment /></Layout></P>} />
        <Route path="/staff/documents" element={<P><Layout portal="staff"><Documents /></Layout></P>} />
        <Route path="/staff/notifications" element={<P><Layout portal="staff"><Notifications /></Layout></P>} />
        <Route path="/staff/vendors" element={<P><Layout portal="staff"><Vendors /></Layout></P>} />
        <Route path="/staff/vendors/:id" element={<P><Layout portal="staff"><VendorDetail /></Layout></P>} />
        <Route path="/staff/compliance" element={<P><Layout portal="staff"><Compliance /></Layout></P>} />
        <Route path="/staff/plans" element={<P><Layout portal="staff"><Plans /></Layout></P>} />
        <Route path="/staff/payments" element={<P><Layout portal="staff"><Payments /></Layout></P>} />
        <Route path="/staff/dependents" element={<P><Layout portal="staff"><Dependents /></Layout></P>} />
        <Route path="/staff/associations" element={<P><Layout portal="staff"><Associations /></Layout></P>} />
        <Route path="/staff/employer-invoices" element={<P><Layout portal="staff"><EmployerInvoices /></Layout></P>} />
        <Route path="/staff/exceptions" element={<P><Layout portal="staff"><Exceptions /></Layout></P>} />
        <Route path="/staff/audit-log" element={<P><Layout portal="staff"><AuditLog /></Layout></P>} />

        {/* Employer Portal */}
        <Route path="/employer" element={<P><Layout portal="employer"><EmployerPortal /></Layout></P>} />
        <Route path="/employer/employees" element={<P><Layout portal="employer"><EmployerPortal section="employees" /></Layout></P>} />
        <Route path="/employer/enrollments" element={<P><Layout portal="employer"><EmployerPortal section="enrollments" /></Layout></P>} />
        <Route path="/employer/invoices" element={<P><Layout portal="employer"><EmployerPortal section="invoices" /></Layout></P>} />
        <Route path="/employer/deductions" element={<P><Layout portal="employer"><EmployerPortal section="deductions" /></Layout></P>} />

        {/* Employee Portal */}
        <Route path="/employee" element={<P><Layout portal="employee"><EmployeePortal /></Layout></P>} />

        {/* Broker Portal */}
        <Route path="/broker" element={<P><Layout portal="broker"><BrokerPortal /></Layout></P>} />

        {/* Association Portal */}
        <Route path="/association" element={<P><Layout portal="staff"><AssociationPortal /></Layout></P>} />
      </Routes>
    </BrowserRouter>
    </ConfirmProvider>
  );
}
