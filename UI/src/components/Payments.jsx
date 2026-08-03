import React, { useState, useEffect } from 'react';
import {
  Search, RefreshCw, Sliders, CheckCircle2, AlertTriangle, Clock, ShieldAlert,
  Download, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

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

export default function Payments({ API_BASE, token, user, filterOptions, onLogout }) {
  // PAYMENTS MODULE STATES (API-based Pagination, Search, Sorting & Filters)
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
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const togglePaymentColumn = (key) => {
    setPaymentVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const fetchPaymentData = async () => {
    setPaymentLoading(true);
    try {
      let url = `${API_BASE}/payments?page=${paymentPage}&pageSize=${paymentPageSize}&sortBy=${paymentSortBy}&sortOrder=${paymentSortOrder}`;
      if (paymentSearchInput.trim()) url += `&search=${encodeURIComponent(paymentSearchInput.trim())}`;
      if (paymentStatusFilter !== 'ALL') url += `&status=${encodeURIComponent(paymentStatusFilter)}`;
      if (paymentCourseFilter !== 'ALL') url += `&courseName=${encodeURIComponent(paymentCourseFilter)}`;
      if (paymentSemesterFilter !== 'ALL') url += `&semester=${encodeURIComponent(paymentSemesterFilter)}`;
      if (paymentStartDate) url += `&startDate=${encodeURIComponent(paymentStartDate)}`;
      if (paymentEndDate) url += `&endDate=${encodeURIComponent(paymentEndDate)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 && onLogout) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setPaymentList(data.items || data.Items || []);
        setPaymentTotalPages(data.totalPages || data.TotalPages || 1);
        setPaymentTotalCount(data.totalCount || data.TotalCount || 0);
        const stats = data.stats || data.Stats;
        if (stats) {
          setPaymentStats(stats);
        }
      }
    } catch (e) {
      console.error('Error fetching payment data:', e);
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [paymentPage, paymentPageSize, paymentStatusFilter, paymentCourseFilter, paymentSemesterFilter, paymentStartDate, paymentEndDate, paymentSortBy, paymentSortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPaymentData();
    }, 400);
    return () => clearTimeout(timer);
  }, [paymentSearchInput]);

  const handlePaymentSort = (column) => {
    if (paymentSortBy === column) {
      setPaymentSortOrder(paymentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPaymentSortBy(column);
      setPaymentSortOrder('desc');
    }
    setPaymentPage(1);
  };

  const handleClearPaymentFilters = () => {
    setPaymentSearchInput('');
    setPaymentStatusFilter('ALL');
    setPaymentCourseFilter('ALL');
    setPaymentSemesterFilter('ALL');
    setPaymentStartDate('');
    setPaymentEndDate('');
    setPaymentPage(1);
  };

  const handleExportPaymentsExcel = async () => {
    if (paymentTotalCount === 0) {
      alert('No payment records to export.');
      return;
    }
    setPaymentExporting(true);
    try {
      let url = `${API_BASE}/payments?page=1&pageSize=-1&sortBy=${paymentSortBy}&sortOrder=${paymentSortOrder}`;
      if (paymentSearchInput.trim()) url += `&search=${encodeURIComponent(paymentSearchInput.trim())}`;
      if (paymentStatusFilter !== 'ALL') url += `&status=${encodeURIComponent(paymentStatusFilter)}`;
      if (paymentCourseFilter !== 'ALL') url += `&courseName=${encodeURIComponent(paymentCourseFilter)}`;
      if (paymentSemesterFilter !== 'ALL') url += `&semester=${encodeURIComponent(paymentSemesterFilter)}`;
      if (paymentStartDate) url += `&startDate=${encodeURIComponent(paymentStartDate)}`;
      if (paymentEndDate) url += `&endDate=${encodeURIComponent(paymentEndDate)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const exportItems = data.items || data.Items || paymentList;

      const headers = ['Order/Txn ID', 'PayU Payment ID', 'Student ID', 'Student Name', 'Roll No', 'Enroll No', 'Course', 'College', 'Amount (INR)', 'Semester', 'Status', 'User Status', 'Created At'];
      const csvRows = [headers.join(',')];

      exportItems.forEach(p => {
        csvRows.push([
          `"${p.PayuOrderId || ''}"`,
          `"${p.PayuPaymentId || ''}"`,
          `"${p.StudentId || ''}"`,
          `"${(p.StudentName || '').replace(/"/g, '""')}"`,
          `"${p.RollNo || ''}"`,
          `"${p.EnrollNo || ''}"`,
          `"${(p.CourseName || '').replace(/"/g, '""')}"`,
          `"${(p.CollegeName || '').replace(/"/g, '""')}"`,
          `"${p.Amount || 0}"`,
          `"${p.Semester || ''}"`,
          `"${p.Status || ''}"`,
          `"${p.UserStatus || ''}"`,
          `"${p.CreatedAt ? new Date(p.CreatedAt).toLocaleString('en-IN') : ''}"`
        ].join(','));
      });

      const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Payments_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (e) {
      console.error('Error exporting payments:', e);
      alert('Failed to export payments Excel.');
    } finally {
      setPaymentExporting(false);
    }
  };

  return (
    <div className="directory-container">
      {/* Interactive Payments Status Cards (Grid of 4) */}
      <div className="stats-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: Total Payment Received */}
        <div
          className={`stat-card ${paymentStatusFilter === 'CAPTURED' ? 'active-filter-card' : ''}`}
          onClick={() => {
            setPaymentStatusFilter(paymentStatusFilter === 'CAPTURED' ? 'ALL' : 'CAPTURED');
            setPaymentPage(1);
          }}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: paymentStatusFilter === 'CAPTURED' ? '2px solid #059669' : '1px solid #e2e8f0',
            boxShadow: paymentStatusFilter === 'CAPTURED' ? '0 10px 15px -3px rgba(5, 150, 105, 0.15)' : 'none',
            background: paymentStatusFilter === 'CAPTURED' ? '#f0fdf4' : '#ffffff'
          }}
        >
          <div className="stat-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Payment Received</span>
            <h3 className="stat-value">{paymentStats.capturedCount || 0}</h3>
            <span className="stat-trend positive">Total Paid: {formatCurrency(paymentStats.capturedAmount || 0)}</span>
          </div>
        </div>

        {/* Card 2: How Many Withdrawn */}
        <div
          className={`stat-card ${paymentStatusFilter === 'WITHDRAW' ? 'active-filter-card' : ''}`}
          onClick={() => {
            setPaymentStatusFilter(paymentStatusFilter === 'WITHDRAW' ? 'ALL' : 'WITHDRAW');
            setPaymentPage(1);
          }}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: paymentStatusFilter === 'WITHDRAW' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            boxShadow: paymentStatusFilter === 'WITHDRAW' ? '0 10px 15px -3px rgba(220, 38, 38, 0.15)' : 'none',
            background: paymentStatusFilter === 'WITHDRAW' ? '#fef2f2' : '#ffffff'
          }}
        >
          <div className="stat-icon-wrapper purple" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">How Many Withdrawn</span>
            <h3 className="stat-value">{paymentStats.withdrawCount || 0}</h3>
            <span className="stat-trend negative">Profile Edits Locked</span>
          </div>
        </div>

        {/* Card 3: How Many Initiated */}
        <div
          className={`stat-card ${paymentStatusFilter === 'INITIATED' ? 'active-filter-card' : ''}`}
          onClick={() => {
            setPaymentStatusFilter(paymentStatusFilter === 'INITIATED' ? 'ALL' : 'INITIATED');
            setPaymentPage(1);
          }}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: paymentStatusFilter === 'INITIATED' ? '2px solid #d97706' : '1px solid #e2e8f0',
            boxShadow: paymentStatusFilter === 'INITIATED' ? '0 10px 15px -3px rgba(217, 119, 6, 0.15)' : 'none',
            background: paymentStatusFilter === 'INITIATED' ? '#fffbeb' : '#ffffff'
          }}
        >
          <div className="stat-icon-wrapper yellow">
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">How Many Initiated</span>
            <h3 className="stat-value">{paymentStats.initiatedCount || 0}</h3>
            <span className="stat-trend neutral">Awaiting Gateway</span>
          </div>
        </div>

        {/* Card 4: How Many Failed */}
        <div
          className={`stat-card ${paymentStatusFilter === 'FAILED' ? 'active-filter-card' : ''}`}
          onClick={() => {
            setPaymentStatusFilter(paymentStatusFilter === 'FAILED' ? 'ALL' : 'FAILED');
            setPaymentPage(1);
          }}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: paymentStatusFilter === 'FAILED' ? '2px solid #991b1b' : '1px solid #e2e8f0',
            boxShadow: paymentStatusFilter === 'FAILED' ? '0 10px 15px -3px rgba(153, 27, 27, 0.15)' : 'none',
            background: paymentStatusFilter === 'FAILED' ? '#fef2f2' : '#ffffff'
          }}
        >
          <div className="stat-icon-wrapper red" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">How Many Failed</span>
            <h3 className="stat-value">{paymentStats.failedCount || 0}</h3>
            <span className="stat-trend negative">Cancelled / Failed</span>
          </div>
        </div>
      </div>

      {/* Single Responsive Toolbar Row */}
      <div className="directory-header-card" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px 18px', background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        {/* 1. Search Bar Input */}
        <div className="search-bar-wrapper" style={{ flex: '1 1 260px', minWidth: '220px', margin: 0 }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name, roll no, txnid, order id..."
            value={paymentSearchInput}
            onChange={(e) => {
              setPaymentSearchInput(e.target.value);
              setPaymentPage(1);
            }}
            className="search-input"
          />
        </div>

        {/* 2. Filter Dropdowns Inline */}
        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Status:</span>
          <select
            value={paymentStatusFilter}
            onChange={(e) => { setPaymentStatusFilter(e.target.value); setPaymentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CAPTURED">CAPTURED (Fee Paid)</option>
            <option value="WITHDRAW">WITHDRAW</option>
            <option value="INITIATED">INITIATED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Course:</span>
          <select
            value={paymentCourseFilter}
            onChange={(e) => { setPaymentCourseFilter(e.target.value); setPaymentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Courses</option>
            {(filterOptions?.courses || []).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Sem:</span>
          <select
            value={paymentSemesterFilter}
            onChange={(e) => { setPaymentSemesterFilter(e.target.value); setPaymentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Semesters</option>
            {(filterOptions?.semesters || []).map(sem => (
              <option key={sem} value={sem}>Sem {sem}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter (Date Wise Payment) */}
        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>From:</span>
          <input
            type="date"
            value={paymentStartDate}
            onChange={(e) => { setPaymentStartDate(e.target.value); setPaymentPage(1); }}
            className="filter-select"
            style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>To:</span>
          <input
            type="date"
            value={paymentEndDate}
            onChange={(e) => { setPaymentEndDate(e.target.value); setPaymentPage(1); }}
            className="filter-select"
            style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        {(paymentSearchInput || paymentStatusFilter !== 'ALL' || paymentCourseFilter !== 'ALL' || paymentSemesterFilter !== 'ALL' || paymentStartDate || paymentEndDate) && (
          <button onClick={handleClearPaymentFilters} className="btn-clear-filters" style={{ padding: '7px 12px', fontSize: '12.5px' }}>
            <X size={14} />
            <span>Clear</span>
          </button>
        )}

        {/* 3. Right Toolbar Actions */}
        <div className="toolbar-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Column Toggle Dropdown */}
          <div className="column-toggle-container" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowPaymentColumnToggle(!showPaymentColumnToggle)}
              className="btn-clear-filters"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ffffff' }}
            >
              <Sliders size={15} />
              <span>Columns ({Object.values(paymentVisibleColumns).filter(Boolean).length}/{paymentColumnList.length})</span>
            </button>

            {showPaymentColumnToggle && (
              <div className="column-toggle-dropdown" style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                zIndex: 50,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                minWidth: '230px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Toggle Columns</strong>
                  <button
                    type="button"
                    onClick={() => setShowPaymentColumnToggle(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {paymentColumnList.map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={paymentVisibleColumns[col.key]}
                        onChange={() => togglePaymentColumn(col.key)}
                        style={{ accentColor: '#4f46e5', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExportPaymentsExcel}
            disabled={paymentExporting || paymentTotalCount === 0}
            className="btn-export"
            style={{ padding: '8px 14px' }}
            title="Download Payments to Excel (.csv)"
          >
            <FileSpreadsheet size={15} />
            <span>{paymentExporting ? 'Exporting...' : 'Download Excel'}</span>
          </button>

          <button
            onClick={fetchPaymentData}
            disabled={paymentLoading}
            className="btn-refresh"
            style={{ padding: '8px 10px' }}
            title="Refresh Payment Records"
          >
            <RefreshCw size={14} className={paymentLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Payments Table Card */}
      <div className="dashboard-table-card full" style={{ marginTop: '16px' }}>
        <div className="table-scroll-container">
          <table className="custom-table">
            <thead>
              <tr>
                {paymentVisibleColumns.txnId && (
                  <th onClick={() => handlePaymentSort('payuorderid')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Txn ID / PayU Order ID</span>
                      {paymentSortBy === 'payuorderid' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}

                {paymentVisibleColumns.studentName && (
                  <th onClick={() => handlePaymentSort('studentname')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Student Name & ID</span>
                      {paymentSortBy === 'studentname' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}

                {paymentVisibleColumns.rollNo && (
                  <th onClick={() => handlePaymentSort('rollno')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Roll No / Enroll No</span>
                      {paymentSortBy === 'rollno' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}

                {paymentVisibleColumns.course && <th>Course & College</th>}

                {paymentVisibleColumns.amount && (
                  <th onClick={() => handlePaymentSort('amount')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Amount</span>
                      {paymentSortBy === 'amount' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}

                {paymentVisibleColumns.semester && <th>Semester</th>}

                {paymentVisibleColumns.status && (
                  <th onClick={() => handlePaymentSort('status')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Gateway Status</span>
                      {paymentSortBy === 'status' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}

                {paymentVisibleColumns.userStatus && <th>Local Status</th>}

                {paymentVisibleColumns.date && (
                  <th onClick={() => handlePaymentSort('createdat')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Date Created</span>
                      {paymentSortBy === 'createdat' ? (paymentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paymentLoading ? (
                <tr>
                  <td colSpan={Object.values(paymentVisibleColumns).filter(Boolean).length || 1} className="empty-row">
                    <div className="spinner-wrapper" style={{ justifyContent: 'center' }}>
                      <div className="spinner"></div>
                      <span>Loading payment records...</span>
                    </div>
                  </td>
                </tr>
              ) : paymentList.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(paymentVisibleColumns).filter(Boolean).length || 1} className="empty-row">
                    No matching payment records found.
                  </td>
                </tr>
              ) : (
                paymentList.map(p => (
                  <tr key={p.Id}>
                    {paymentVisibleColumns.txnId && (
                      <td>
                        <div className="table-user-cell">
                          <code className="txnid-code"><HighlightText text={p.PayuOrderId || 'N/A'} highlight={paymentSearchInput} /></code>
                          {p.PayuPaymentId && <span className="sub-text">PayId: <HighlightText text={p.PayuPaymentId} highlight={paymentSearchInput} /></span>}
                        </div>
                      </td>
                    )}

                    {paymentVisibleColumns.studentName && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold"><HighlightText text={p.StudentName} highlight={paymentSearchInput} /></span>
                          <span className="sub-text">ID: {p.StudentId}</span>
                        </div>
                      </td>
                    )}

                    {paymentVisibleColumns.rollNo && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold">Roll: <HighlightText text={p.RollNo || 'N/A'} highlight={paymentSearchInput} /></span>
                          {p.EnrollNo && <span className="sub-text">Enroll: <HighlightText text={p.EnrollNo} highlight={paymentSearchInput} /></span>}
                        </div>
                      </td>
                    )}

                    {paymentVisibleColumns.course && (
                      <td>
                        <div className="table-user-cell">
                          <span><HighlightText text={p.CourseName || 'N/A'} highlight={paymentSearchInput} /></span>
                          {p.CollegeName && <span className="sub-text">{p.CollegeName}</span>}
                        </div>
                      </td>
                    )}

                    {paymentVisibleColumns.amount && (
                      <td><span className="font-semibold" style={{ color: '#0f172a' }}>{formatCurrency(p.Amount)}</span></td>
                    )}

                    {paymentVisibleColumns.semester && (
                      <td>Sem <HighlightText text={p.Semester || 'N/A'} highlight={paymentSearchInput} /></td>
                    )}

                    {paymentVisibleColumns.status && (
                      <td>
                        <span className={`status-pill ${p.Status ? p.Status.toLowerCase() : 'initiated'}`}>
                          {p.Status}
                        </span>
                      </td>
                    )}

                    {paymentVisibleColumns.userStatus && (
                      <td><span className="sub-text">{p.UserStatus || 'Initiated'}</span></td>
                    )}

                    {paymentVisibleColumns.date && (
                      <td><span className="sub-text">{p.CreatedAt ? new Date(p.CreatedAt).toLocaleString('en-IN') : 'N/A'}</span></td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payments Pagination Footer */}
        <div className="pagination-card-footer">
          <div className="pagination-info">
            <span className="pagination-text">
              Showing {paymentTotalCount > 0 ? (paymentPage - 1) * paymentPageSize + 1 : 0} to {Math.min(paymentPage * paymentPageSize, paymentTotalCount)} of {paymentTotalCount} entries
            </span>

            <div className="rows-per-page-selector">
              <label>Rows per page:</label>
              <select
                value={paymentPageSize}
                onChange={(e) => {
                  setPaymentPageSize(Number(e.target.value));
                  setPaymentPage(1);
                }}
                className="rows-select"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Show All (All Records)</option>
              </select>
            </div>
          </div>

          <div className="pagination-controls">
            <button
              onClick={() => setPaymentPage(1)}
              disabled={paymentPage === 1 || paymentLoading}
              className="page-btn"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              onClick={() => setPaymentPage(p => Math.max(p - 1, 1))}
              disabled={paymentPage === 1 || paymentLoading}
              className="page-btn"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, paymentTotalPages) }, (_, i) => {
              let pageNum;
              if (paymentTotalPages <= 5) {
                pageNum = i + 1;
              } else if (paymentPage <= 3) {
                pageNum = i + 1;
              } else if (paymentPage >= paymentTotalPages - 2) {
                pageNum = paymentTotalPages - 4 + i;
              } else {
                pageNum = paymentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPaymentPage(pageNum)}
                  className={`page-btn ${paymentPage === pageNum ? 'active' : ''}`}
                  disabled={paymentLoading}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPaymentPage(p => Math.min(p + 1, paymentTotalPages))}
              disabled={paymentPage >= paymentTotalPages || paymentLoading}
              className="page-btn"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setPaymentPage(paymentTotalPages)}
              disabled={paymentPage >= paymentTotalPages || paymentLoading}
              className="page-btn"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}