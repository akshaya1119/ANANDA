import { useState, useEffect } from 'react';
import {
  Users, CreditCard, ShieldCheck, Clock, Percent,
  LogOut, RefreshCw, Layers, Sliders, FileText
} from 'lucide-react';
import StudentProfileModal from '../components/StudentProfileModal';
import Students from '../components/Students';
import Payments from '../components/Payments';
import AuditLogs from '../components/AuditLogs';
import Settings from '../components/Settings';
import SesssionExpiry from '../components/SesssionExpiry';

const API_BASE = import.meta.env.VITE_API_URL || 'https://anandaexams.com/NEPVIExitAdminAPI/api';

// Helper component to locally highlight search term matches
const HighlightText = ({ text, highlight }) => {
  if (text === null || text === undefined || text === '') return null;
  const textStr = text.toString();
  const searchStr = (highlight || '').trim();
  if (!searchStr) return textStr;

  const escapedSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedSearch})`, 'gi');
  const parts = textStr.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchStr.toLowerCase() ? (
          <mark key={index} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function Dashboard({ token, user, loginTime, jwtDecoded, onLogout }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('ananda_admin_active_tab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ananda_admin_active_tab', activeTab);
  }, [activeTab]);
  const [stats, setStats] = useState({
    TotalStudents: 0,
    VerifiedAadhar: 0,
    PendingAadhar: 0,
    TotalRevenue: 0,
    SuccessRate: 100
  });
  const [payments, setPayments] = useState([]);
  const [dashboardStudents, setDashboardStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment search
  const [paymentSearch, setPaymentSearch] = useState('');

  // ----------------------------------------------------
  // STUDENT DIRECTORY STATES (API-based Pagination, Search & Filters)
  // ----------------------------------------------------
  const [studentList, setStudentList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [studentTotalCount, setStudentTotalCount] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter Dropdowns State
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState('ALL');
  const [selectedAadharStatus, setSelectedAadharStatus] = useState('ALL');

  // Sorting State for Student Directory
  const [studentSortBy, setStudentSortBy] = useState('id');
  const [studentSortOrder, setStudentSortOrder] = useState('desc');

  // Column Toggle State (All columns enabled by default)
  const [visibleColumns, setVisibleColumns] = useState({
    actions: true,
    rollNo: true,
    studentName: true,
    course: true,
    session: true,
    mobileEmail: true,
    aadhar: true,
    aadharStatus: true,
    paymentStatus: true,
    apaarId: true
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // ----------------------------------------------------
  // PAYMENTS MODULE STATES (API-based Pagination, Search, Sorting & Filters)
  // ----------------------------------------------------
  const [paymentList, setPaymentList] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [paymentTotalCount, setPaymentTotalCount] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [paymentSearchInput, setPaymentSearchInput] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentCourseFilter, setPaymentCourseFilter] = useState('ALL');
  const [paymentSemesterFilter, setPaymentSemesterFilter] = useState('ALL');
  const [paymentSortBy, setPaymentSortBy] = useState('createdat');
  const [paymentSortOrder, setPaymentSortOrder] = useState('desc');
  const [paymentExporting, setPaymentExporting] = useState(false);
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    capturedCount: 0,
    capturedAmount: 0,
    withdrawCount: 0,
    initiatedCount: 0,
    failedCount: 0,
    successRate: 0
  });

  const [paymentVisibleColumns, setPaymentVisibleColumns] = useState({
    txnId: true,
    studentName: true,
    rollNo: true,
    course: true,
    amount: true,
    semester: true,
    status: true,
    userStatus: true,
    date: true
  });
  const [showPaymentColumnToggle, setShowPaymentColumnToggle] = useState(false);

  const paymentColumnList = [
    { key: 'txnId', label: 'Transaction / Order ID' },
    { key: 'studentName', label: 'Student Name & ID' },
    { key: 'rollNo', label: 'Roll No / Enroll No' },
    { key: 'course', label: 'Course & College' },
    { key: 'amount', label: 'Amount (INR)' },
    { key: 'semester', label: 'Semester' },
    { key: 'status', label: 'Gateway Status' },
    { key: 'userStatus', label: 'Local Status' },
    { key: 'date', label: 'Date Created' }
  ];

  const togglePaymentColumn = (key) => {
    setPaymentVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ----------------------------------------------------
  // JWT SESSION COUNTDOWN TIMER & ACTIVE LOGIN TRACKER
  // ----------------------------------------------------
  const [sessionRemaining, setSessionRemaining] = useState(3600);
  const [loginElapsedMins, setLoginElapsedMins] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const startMs = loginTime ? Number(loginTime) : Date.now();
    const targetExpMs = jwtDecoded?.exp ? jwtDecoded.exp * 1000 : startMs + (60 * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((targetExpMs - now) / 1000));
      const elapsedM = Math.floor((now - startMs) / (1000 * 60));

      setSessionRemaining(diffSecs);
      setLoginElapsedMins(elapsedM);

      if (diffSecs <= 0) {
        setSessionExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [loginTime, jwtDecoded]);

  const formatCountdown = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionPillClass = (secs) => {
    if (secs > 600) return 'session-pill-green';
    if (secs > 120) return 'session-pill-warning';
    return 'session-pill-alert';
  };



  const columnList = [
    { key: 'rollNo', label: 'Roll No / Enroll No' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'course', label: 'Course & Semester' },
    { key: 'session', label: 'Academic Session' },
    { key: 'mobileEmail', label: 'Registered Contact' },
    { key: 'aadhar', label: 'Aadhaar Number' },
    { key: 'aadharStatus', label: 'Aadhaar Status' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'apaarId', label: 'APAAR ID' },
    { key: 'actions', label: 'Action (Edit)' }
  ];

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter Options from Backend API
  const [filterOptions, setFilterOptions] = useState({
    courses: [],
    semesters: [],
    sessions: []
  });

  // 1. Fetch Dashboard Stats & Recent Data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.status === 401) {
        onLogout();
        return;
      }
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.Message || 'Failed to fetch stats');
      setStats(statsData);

      // 2. Fetch Recent Payments
      const payRes = await fetch(`${API_BASE}/dashboard/recent-payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payData = await payRes.json();
      if (payRes.ok) setPayments(payData);

      // 3. Fetch Recent Students for Dashboard Overview
      const studRes = await fetch(`${API_BASE}/dashboard/recent-students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const studData = await studRes.json();
      if (studRes.ok) setDashboardStudents(studData);

    } catch (err) {
      setError(err.message || 'Error fetching portal data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Filter Options for Student Directory Dropdowns
  const fetchFilterOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/filter-options`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFilterOptions({
          courses: data.courses || [],
          semesters: data.semesters || [],
          sessions: data.sessions || []
        });
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  // 3. Fetch Paginated & Filtered Student List from Backend API
  const fetchDirectoryStudents = async () => {
    setStudentLoading(true);
    try {
      const params = new URLSearchParams({
        page: studentPage.toString(),
        pageSize: studentPageSize.toString(),
        search: studentSearch || '',
        courseName: selectedCourse || 'ALL',
        semester: selectedSemester || 'ALL',
        session: selectedSession || 'ALL',
        sortBy: studentSortBy || 'id',
        sortOrder: studentSortOrder || 'desc'
      });

      if (selectedAadharStatus === 'VERIFIED') {
        params.append('aadharValidation', 'true');
      } else if (selectedAadharStatus === 'PENDING') {
        params.append('aadharValidation', 'false');
      }

      const res = await fetch(`${API_BASE}/students?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setStudentList(data.items || []);
        setStudentTotalCount(data.totalCount || 0);
        setStudentTotalPages(data.totalPages || 1);
      } else {
        throw new Error(data.Message || 'Failed to fetch student directory');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setStudentLoading(false);
    }
  };

  // Payments Date Range States
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // 4. Fetch Payments List & Statistics from Backend API
  const fetchPaymentData = async () => {
    setPaymentLoading(true);
    try {
      const params = new URLSearchParams({
        page: paymentPage.toString(),
        pageSize: paymentPageSize.toString(),
        search: paymentSearchInput || '',
        status: paymentStatusFilter || 'ALL',
        courseName: paymentCourseFilter || 'ALL',
        semester: paymentSemesterFilter || 'ALL',
        sortBy: paymentSortBy || 'createdat',
        sortOrder: paymentSortOrder || 'desc'
      });
      if (paymentStartDate) params.append('startDate', paymentStartDate);
      if (paymentEndDate) params.append('endDate', paymentEndDate);

      const res = await fetch(`${API_BASE}/payments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setPaymentList(data.items || []);
        setPaymentTotalCount(data.totalCount || 0);
        setPaymentTotalPages(data.totalPages || 1);
        if (data.stats) {
          setPaymentStats(data.stats);
        }
      } else {
        throw new Error(data.Message || 'Failed to fetch payment records');
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // 4. Download / Export to Excel (Exports exactly what is currently in the table)
  const handleExportExcel = () => {
    if (!studentList || studentList.length === 0) {
      alert('No student records currently in table to export.');
      return;
    }

    setExporting(true);
    try {
      // Prepare Excel CSV Headers matching table data
      const headers = [
        "Enrollment No", "Roll No", "Student Name", "Father Name", "Mother Name",
        "Gender", "DOB", "Category", "Course Name", "Semester", "Session",
        "Aadhar Number", "Aadhar Validation", "APAAR ID", "Mobile", "Email ID", "CGPA", "Payment Status"
      ];

      const rows = studentList.map(s => [
        `"${s.ENROLL_NO || ''}"`,
        `"${s.ROLLNO || ''}"`,
        `"${(s.NAME || '').replace(/"/g, '""')}"`,
        `"${(s.FNAME || '').replace(/"/g, '""')}"`,
        `"${(s.MNAME || '').replace(/"/g, '""')}"`,
        `"${s.GENDER || ''}"`,
        `"${s.DOB || ''}"`,
        `"${s.CATEGORY || ''}"`,
        `"${(s.COURSE_NAME || '').replace(/"/g, '""')}"`,
        `"${s.SEMESTER || ''}"`,
        `"${s.SESSION || ''}"`,
        `"${s.AADHAR || ''}"`,
        `"${s.AADHARVALIDATION ? 'Verified' : 'Pending'}"`,
        `"${s.APAARID || ''}"`,
        `"${s.MOBILE || ''}"`,
        `"${s.EMAIL_ID || ''}"`,
        `"${s.CGPA || 0}"`,
        `"${s.PAYMENT_STATUS || ''}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ananda_Students_CurrentTable_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(err.message || 'Error exporting table data to Excel.');
    } finally {
      setExporting(false);
    }
  };

  // Export Payments to Excel CSV
  const handleExportPaymentsExcel = () => {
    if (!paymentList || paymentList.length === 0) {
      alert('No payment records currently in table to export.');
      return;
    }

    setPaymentExporting(true);
    try {
      const headers = [
        "Txn ID / Order ID", "PayU Payment ID", "Student ID", "Student Name",
        "Roll No", "Enrollment No", "Course", "College", "Amount (INR)",
        "Currency", "Gateway Status", "User Status", "Semester", "Remarks", "Date Created"
      ];

      const rows = paymentList.map(p => [
        `"${p.PayuOrderId || ''}"`,
        `"${p.PayuPaymentId || ''}"`,
        `"${p.StudentId || ''}"`,
        `"${(p.StudentName || '').replace(/"/g, '""')}"`,
        `"${p.RollNo || ''}"`,
        `"${p.EnrollNo || ''}"`,
        `"${(p.CourseName || '').replace(/"/g, '""')}"`,
        `"${(p.CollegeName || '').replace(/"/g, '""')}"`,
        `"${p.Amount || 0}"`,
        `"${p.Currency || 'INR'}"`,
        `"${p.Status || ''}"`,
        `"${(p.UserStatus || '').replace(/"/g, '""')}"`,
        `"${p.Semester || ''}"`,
        `"${(p.Remarks || '').replace(/"/g, '""')}"`,
        `"${p.CreatedAt || ''}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ananda_Payments_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting payment records to Excel.');
    } finally {
      setPaymentExporting(false);
    }
  };

  // Reset Filters
  const handleClearFilters = () => {
    setStudentSearch('');
    setSelectedCourse('ALL');
    setSelectedSemester('ALL');
    setSelectedSession('ALL');
    setSelectedAadharStatus('ALL');
    setStudentPage(1);
  };

  const handleClearPaymentFilters = () => {
    setPaymentSearchInput('');
    setPaymentStatusFilter('ALL');
    setPaymentCourseFilter('ALL');
    setPaymentSemesterFilter('ALL');
    setPaymentPage(1);
  };



  // Student Sort Handler
  const handleStudentSort = (field) => {
    if (studentSortBy === field) {
      setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortBy(field);
      setStudentSortOrder('asc');
    }
    setStudentPage(1);
  };

  // Payment Sort Handler
  const handlePaymentSort = (field) => {
    if (paymentSortBy === field) {
      setPaymentSortOrder(paymentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPaymentSortBy(field);
      setPaymentSortOrder('asc');
    }
    setPaymentPage(1);
  };

  // Initial dashboard load & filter options
  useEffect(() => {
    fetchDashboardData();
    fetchFilterOptions();
  }, [token]);

  // Trigger Student Directory fetch on filter / search / page / sort change
  useEffect(() => {
    if (activeTab === 'students') {
      fetchDirectoryStudents();
    }
  }, [activeTab, studentPage, studentPageSize, selectedCourse, selectedSemester, selectedSession, selectedAadharStatus, studentSortBy, studentSortOrder]);

  // Trigger Payments fetch on filter / search / page / sort / date change
  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPaymentData();
    }
  }, [activeTab, paymentPage, paymentPageSize, paymentStatusFilter, paymentCourseFilter, paymentSemesterFilter, paymentStartDate, paymentEndDate, paymentSortBy, paymentSortOrder]);

  // Handle Search Input Change (Debounced API fetch)
  useEffect(() => {
    if (activeTab === 'students') {
      const timer = setTimeout(() => {
        fetchDirectoryStudents();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [studentSearch]);

  useEffect(() => {
    if (activeTab === 'payments') {
      const timer = setTimeout(() => {
        fetchPaymentData();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [paymentSearchInput]);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const hasActiveFilters = studentSearch || selectedCourse !== 'ALL' || selectedSemester !== 'ALL' || selectedSession !== 'ALL' || selectedAadharStatus !== 'ALL';

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="/logo.png"
            onError={(e) => { e.currentTarget.src = '/nepviexitadmin/logo.png'; }}
            alt="ananda Logo"
            className="sidebar-logo-img"
          />
          <span className="brand-text">ananda Admin</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layers size={18} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} />
            <span>Students</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard size={18} />
            <span>Payments</span>
          </button>

          {/* Audit Logs tab accessible ONLY when User ID is 1 / primary admin */}
          {(user?.UserId === 1 || user?.UserId === '1' || user?.Id === 1 || user?.Id === '1' || user?.UserId === 'USR1001' || user?.UserName?.toLowerCase() === 'admin') && (
            <button
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <FileText size={18} />
              <span>Audit Logs</span>
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user.FullName ? user.FullName[0].toUpperCase() : (jwtDecoded?.unique_name ? jwtDecoded.unique_name[0].toUpperCase() : 'A')}
          </div>
          <div className="user-info">
            <span className="user-name">{user.FullName || jwtDecoded?.unique_name || 'Administrator'}</span>
            <span className="user-role">{jwtDecoded?.role || 'Admin'} &bull; {loginElapsedMins}m logged in</span>
          </div>
          <button onClick={onLogout} className="logout-btn" title="Logout Session">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-title-area">
            <h1>
              {activeTab === 'dashboard' && 'Portal Overview'}
              {activeTab === 'students' && 'Student Directory'}
              {activeTab === 'payments' && 'Payment Logs'}
              {activeTab === 'logs' && 'Admin Audit Trail Logs'}
              {activeTab === 'settings' && 'System Settings'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'dashboard' && 'Real-time summary of student enrollments and fee payments.'}
              {activeTab === 'students' && 'Manage student profiles with search, filters, pagination & Excel download.'}
              {activeTab === 'payments' && 'Track PayU transaction histories and exit status.'}
              {activeTab === 'logs' && 'Audit trail of which admin edited which student, old vs new values, timestamp & remarks.'}
              {activeTab === 'settings' && 'Configure database connections and system limits.'}
            </p>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Live JWT Session Expiry Timer Pill */}
            <div
              className={`session-pill ${getSessionPillClass(sessionRemaining)}`}
              title={`Logged in at ${new Date(loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Active for ${loginElapsedMins} mins)`}
            >
              <Clock size={14} className="session-clock-icon" />
              <div className="session-text-group">
                <span className="session-label">Session:</span>
                <span className="session-timer font-mono">{formatCountdown(sessionRemaining)}</span>
              </div>
            </div>

            <button onClick={() => { fetchDashboardData(); if (activeTab === 'students') fetchDirectoryStudents(); }} disabled={loading || studentLoading} className="btn-refresh">
              <RefreshCw size={16} className={loading || studentLoading ? 'spin' : ''} />
              <span>Refresh Data</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="dashboard-error">
            <p>{error}</p>
          </div>
        )}

        {/* LOADING SHIMMER */}
        {loading && activeTab === 'dashboard' && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Retrieving portal records...</p>
          </div>
        )}

        {(!loading || activeTab !== 'dashboard') && (
          <div className="tab-content">
            {/* 1. DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon purple">
                      <Users size={22} />
                    </div>
                    <div className="stat-details">
                      <h3>Total Students</h3>
                      <p>{stats.TotalStudents.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon green">
                      <ShieldCheck size={22} />
                    </div>
                    <div className="stat-details">
                      <h3>Verified Aadhar</h3>
                      <p>{stats.VerifiedAadhar.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon orange">
                      <Clock size={22} />
                    </div>
                    <div className="stat-details">
                      <h3>Pending Aadhar</h3>
                      <p>{stats.PendingAadhar.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon blue">
                      <CreditCard size={22} />
                    </div>
                    <div className="stat-details">
                      <h3>Fees Collected</h3>
                      <p>{formatCurrency(stats.TotalRevenue)}</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon percent">
                      <Percent size={22} />
                    </div>
                    <div className="stat-details">
                      <h3>Success Rate</h3>
                      <p>{stats.SuccessRate}%</p>
                    </div>
                  </div>
                </div>

                {/* Split Tables section */}
                <div className="dashboard-split">
                  {/* Recent Payments Card */}
                  <div className="dashboard-table-card">
                    <div className="card-header">
                      <h2>Recent Payments</h2>
                      <button className="text-btn" onClick={() => setActiveTab('payments')}>View All</button>
                    </div>
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="empty-row">No recent payments.</td>
                            </tr>
                          ) : (
                            payments.slice(0, 5).map(p => (
                              <tr key={p.Id}>
                                <td>
                                  <div className="table-user-cell">
                                    <span className="font-semibold">{p.StudentName}</span>
                                    <span className="sub-text">ID: {p.StudentId}</span>
                                  </div>
                                </td>
                                <td>{formatCurrency(p.Amount)}</td>
                                <td>
                                  <span className={`status-pill ${p.Status.toLowerCase()}`}>
                                    {p.Status}
                                  </span>
                                </td>
                                <td><span className="sub-text">{p.CreatedAt}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Students Card */}
                  <div className="dashboard-table-card">
                    <div className="card-header">
                      <h2>Recently Enrolled</h2>
                      <button className="text-btn" onClick={() => setActiveTab('students')}>View All</button>
                    </div>
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Course</th>
                            <th>Aadhar Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardStudents.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="empty-row">No student records found.</td>
                            </tr>
                          ) : (
                            dashboardStudents.slice(0, 5).map(s => (
                              <tr key={s.Id}>
                                <td>
                                  <div className="table-user-cell">
                                    <span className="font-semibold">{s.NAME}</span>
                                    <span className="sub-text">Roll: {s.ROLLNO}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="table-user-cell">
                                    <span>{s.COURSE_NAME}</span>
                                    <span className="sub-text">Sem: {s.SEMESTER}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`verification-badge ${s.AADHARVALIDATION ? 'verified' : 'unverified'}`}>
                                    {s.AADHARVALIDATION ? 'Verified' : 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. STUDENTS DIRECTORY VIEW (MODULARIZED COMPONENT) */}
            {activeTab === 'students' && (
              <Students
                API_BASE={API_BASE}
                token={token}
                user={user}
                filterOptions={filterOptions}
                onLogout={onLogout}
              />
            )}

            {/* 3. PAYMENTS MODULE VIEW (MODULARIZED COMPONENT) */}
            {activeTab === 'payments' && (
              <Payments
                API_BASE={API_BASE}
                token={token}
                user={user}
                filterOptions={filterOptions}
                onLogout={onLogout}
              />
            )}

            {/* 4. AUDIT LOGS VIEW (MODULARIZED COMPONENT) */}
            {activeTab === 'logs' && (
              <AuditLogs
                API_BASE={API_BASE}
                token={token}
                user={user}
                onLogout={onLogout}
              />
            )}

            {/* 4. SETTINGS VIEW */}
            {(activeTab === 'settings' && (user?.UserId === 1 || user?.UserId === '1' || user?.Id === 1 || user?.Id === '1' || user?.UserId === 'USR1001' || user?.UserName?.toLowerCase() === 'admin')) && (
              <Settings
                API_BASE={API_BASE}
              />
            )}
          </div>
        )}
      </main>

      {/* Session Expired Modal */}
      {sessionExpired && (
        <SesssionExpiry
          onLogout={onLogout}
        />
      )}

      {/* STUDENT PROFILE EDIT MODAL */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          user={user}
          token={token}
          apiBase={API_BASE}
          onClose={() => setSelectedStudent(null)}
          onUpdateSuccess={(updatedStudent) => {
            setStudentList(prev => prev.map(item => item.Id === updatedStudent.Id ? updatedStudent : item));
            setSelectedStudent(updatedStudent);
          }}
        />
      )}
    </div>
  );
}
