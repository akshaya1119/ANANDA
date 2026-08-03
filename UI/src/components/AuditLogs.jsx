import React, { useState, useEffect } from 'react';
import {
  Search, RefreshCw, Sliders, ShieldCheck, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, X,
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

export default function AuditLogs({ API_BASE, token, user, onLogout }) {
  const isPrimaryAdmin = user?.UserId === 1 || user?.UserId === '1' || user?.Id === 1 || user?.Id === '1' || user?.UserId === 'USR1001' || user?.UserName?.toLowerCase() === 'admin';

  // AUDIT LOGS MODULE STATES (API-based Pagination, Search, Sorting & Filters)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearchInput, setAuditSearchInput] = useState('');
  const [auditFieldFilter, setAuditFieldFilter] = useState('ALL');
  const [auditAdminFilter, setAuditAdminFilter] = useState('ALL');
  const [auditSortBy, setAuditSortBy] = useState('updatedat');
  const [auditSortOrder, setAuditSortOrder] = useState('desc');
  const [auditExporting, setAuditExporting] = useState(false);
  const [adminList, setAdminList] = useState([]);

  const [visibleAuditColumns, setVisibleAuditColumns] = useState({
    changedBy: true,
    studentInfo: true,
    fieldName: true,
    diffValue: true,
    remarks: true,
    timestamp: true
  });
  const [showAuditColumnToggle, setShowAuditColumnToggle] = useState(false);

  const auditColumnList = [
    { key: 'changedBy', label: 'Changed By (Admin)' },
    { key: 'studentInfo', label: 'Student Name & Roll/Enroll' },
    { key: 'fieldName', label: 'Field Modified' },
    { key: 'diffValue', label: 'Old Value ➔ New Value' },
    { key: 'remarks', label: 'Remarks / Reason' },
    { key: 'timestamp', label: 'Date & Time' }
  ];

  const toggleAuditColumn = (key) => {
    setVisibleAuditColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const fetchAuditLogs = async () => {
    if (!isPrimaryAdmin) return;
    setAuditLoading(true);
    try {
      let url = `${API_BASE}/students/audit-logs?page=${auditPage}&pageSize=${auditPageSize}&sortBy=${auditSortBy}&sortOrder=${auditSortOrder}`;
      if (auditSearchInput.trim()) url += `&search=${encodeURIComponent(auditSearchInput.trim())}`;
      if (auditFieldFilter !== 'ALL') url += `&fieldName=${encodeURIComponent(auditFieldFilter)}`;
      if (auditAdminFilter !== 'ALL') url += `&adminUserId=${encodeURIComponent(auditAdminFilter)}&adminUser=${encodeURIComponent(auditAdminFilter)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 && onLogout) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.Logs || data.logs || []);
        setAuditTotalPages(data.TotalPages || data.totalPages || 1);
        setAuditTotalCount(data.TotalCount || data.totalCount || 0);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchAuditLogAdmins = async () => {
    if (!isPrimaryAdmin) return;
    try {
      let res = await fetch(`${API_BASE}/students/audit-admins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/students/audit-logs/admins`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAdminList(data);
      }
    } catch (e) {
      console.error('Error fetching admin list:', e);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchAuditLogAdmins();
  }, [auditPage, auditPageSize, auditFieldFilter, auditAdminFilter, auditSortBy, auditSortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs();
    }, 400);
    return () => clearTimeout(timer);
  }, [auditSearchInput]);

  const handleAuditSort = (column) => {
    if (auditSortBy === column) {
      setAuditSortOrder(auditSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setAuditSortBy(column);
      setAuditSortOrder('desc');
    }
    setAuditPage(1);
  };

  const handleClearAuditFilters = () => {
    setAuditSearchInput('');
    setAuditFieldFilter('ALL');
    setAuditAdminFilter('ALL');
    setAuditPage(1);
  };

  const handleExportAuditLogsExcel = async () => {
    if (auditTotalCount === 0) {
      alert('No audit logs to export.');
      return;
    }
    setAuditExporting(true);
    try {
      let url = `${API_BASE}/students/audit-logs?page=1&pageSize=-1&sortBy=${auditSortBy}&sortOrder=${auditSortOrder}`;
      if (auditSearchInput.trim()) url += `&search=${encodeURIComponent(auditSearchInput.trim())}`;
      if (auditFieldFilter !== 'ALL') url += `&fieldName=${encodeURIComponent(auditFieldFilter)}`;
      if (auditAdminFilter !== 'ALL') url += `&adminUserId=${encodeURIComponent(auditAdminFilter)}&adminUser=${encodeURIComponent(auditAdminFilter)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const exportLogs = data.Logs || auditLogs;

      const headers = ['Log ID', 'Changed By (Admin)', 'Admin User ID', 'Student ID', 'Student Name', 'Roll No', 'Enroll No', 'Field Modified', 'Old Value', 'New Value', 'Remarks', 'Date & Time'];
      const csvRows = [headers.join(',')];

      exportLogs.forEach(log => {
        csvRows.push([
          `"${log.Id || ''}"`,
          `"${(log.AdminUserName || '').replace(/"/g, '""')}"`,
          `"${log.AdminUserId || ''}"`,
          `"${log.StudentId || ''}"`,
          `"${(log.StudentName || '').replace(/"/g, '""')}"`,
          `"${log.RollNo || ''}"`,
          `"${log.EnrollNo || ''}"`,
          `"${log.FieldName || ''}"`,
          `"${(log.OldValue || '').replace(/"/g, '""')}"`,
          `"${(log.NewValue || '').replace(/"/g, '""')}"`,
          `"${(log.Remarks || '').replace(/"/g, '""')}"`,
          `"${log.UpdatedAt || ''}"`
        ].join(','));
      });

      const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Audit_Logs_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (e) {
      console.error('Error exporting audit logs:', e);
      alert('Failed to export audit logs Excel.');
    } finally {
      setAuditExporting(false);
    }
  };

  if (!isPrimaryAdmin) {
    return (
      <div className="directory-container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="dashboard-table-card full" style={{ padding: '40px', maxWidth: '520px', margin: '0 auto', textAlign: 'center', borderTop: '4px solid #dc2626' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <ShieldCheck size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Access Restricted</h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
            Admin Audit Trail is restricted. Only Primary Administrator (User ID: 1) has permission to view profile edit audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="directory-container">
      {/* Audit Logs Responsive Single-Line Toolbar */}
      <div className="directory-header-card" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px 18px', background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        {/* Search Input for Roll No, Enroll No, Student Name, Admin */}
        <div className="search-bar-wrapper" style={{ flex: '1 1 260px', minWidth: '220px', margin: 0 }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Enroll No, Roll No, Student Name, Admin, or Remarks..."
            value={auditSearchInput}
            onChange={(e) => {
              setAuditSearchInput(e.target.value);
              setAuditPage(1);
            }}
            className="search-input"
          />
        </div>

        {/* Field Edited Dropdown Filter */}
        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Field Filter:</span>
          <select
            value={auditFieldFilter}
            onChange={(e) => { setAuditFieldFilter(e.target.value); setAuditPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Fields</option>
            <option value="PAYMENT_STATUS">PAYMENT_STATUS</option>
            <option value="MOBILE">MOBILE</option>
            <option value="EMAIL_ID">EMAIL_ID</option>
            <option value="AADHAR">AADHAR</option>
            <option value="APAARID">APAARID</option>
            <option value="AADHARVALIDATION">AADHARVALIDATION</option>
          </select>
        </div>

        {/* Admin User Dropdown Filter (Data from Users table, passes UserId) */}
        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Admin:</span>
          <select
            value={auditAdminFilter}
            onChange={(e) => { setAuditAdminFilter(e.target.value); setAuditPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Admins</option>
            {adminList.map(a => {
              const id = a.UserId || a.AdminUserId || '';
              const name = a.FullName || a.AdminUserName || a.UserName || id;
              return (
                <option key={id || name} value={id}>
                  {name} {id ? `(${id})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {(auditSearchInput || auditFieldFilter !== 'ALL' || auditAdminFilter !== 'ALL') && (
          <button onClick={handleClearAuditFilters} className="btn-clear-filters" style={{ padding: '7px 12px', fontSize: '12.5px' }}>
            <X size={14} />
            <span>Clear</span>
          </button>
        )}

        {/* Export & Column Toggle & Refresh Action Controls */}
        <div className="toolbar-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Column Toggle Dropdown */}
          <div className="column-toggle-container" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAuditColumnToggle(!showAuditColumnToggle)}
              className="btn-clear-filters"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ffffff' }}
            >
              <Sliders size={15} />
              <span>Columns ({Object.values(visibleAuditColumns).filter(Boolean).length}/{auditColumnList.length})</span>
            </button>

            {showAuditColumnToggle && (
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
                    onClick={() => setShowAuditColumnToggle(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {auditColumnList.map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={visibleAuditColumns[col.key]}
                        onChange={() => toggleAuditColumn(col.key)}
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
            onClick={handleExportAuditLogsExcel}
            disabled={auditExporting || auditTotalCount === 0}
            className="btn-export"
            style={{ padding: '8px 14px' }}
            title="Download Audit Logs to Excel (.csv)"
          >
            <FileSpreadsheet size={15} />
            <span>{auditExporting ? 'Exporting...' : 'Download Excel'}</span>
          </button>

          <button
            onClick={fetchAuditLogs}
            disabled={auditLoading}
            className="btn-refresh"
            style={{ padding: '8px 10px' }}
            title="Refresh Audit Logs"
          >
            <RefreshCw size={14} className={auditLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Audit Logs Table Card */}
      <div className="dashboard-table-card full">
        <div className="table-scroll-container">
          <table className="custom-table">
            <thead>
              <tr>
                {visibleAuditColumns.changedBy && (
                  <th onClick={() => handleAuditSort('adminname')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Changed By</span>
                      {auditSortBy === 'adminname' ? (auditSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleAuditColumns.studentInfo && (
                  <th onClick={() => handleAuditSort('studentname')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Student Name & Roll/Enroll</span>
                      {auditSortBy === 'studentname' ? (auditSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleAuditColumns.fieldName && (
                  <th onClick={() => handleAuditSort('fieldname')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Field Modified</span>
                      {auditSortBy === 'fieldname' ? (auditSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleAuditColumns.diffValue && <th>Old Value ➔ New Value</th>}
                {visibleAuditColumns.remarks && <th>Remarks / Reason</th>}
                {visibleAuditColumns.timestamp && (
                  <th onClick={() => handleAuditSort('updatedat')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Timestamp</span>
                      {auditSortBy === 'updatedat' ? (auditSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {auditLoading ? (
                <tr>
                  <td colSpan={Object.values(visibleAuditColumns).filter(Boolean).length || 1} className="empty-row">
                    <div className="spinner-wrapper" style={{ justifyContent: 'center' }}>
                      <div className="spinner"></div>
                      <span>Loading audit trail entries...</span>
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleAuditColumns).filter(Boolean).length || 1} className="empty-row">No matching audit trail records found.</td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.Id}>
                    {visibleAuditColumns.changedBy && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold"><HighlightText text={log.AdminUserName} highlight={auditSearchInput} /></span>
                          <span className="sub-text">ID: <HighlightText text={log.AdminUserId || 'USR1001'} highlight={auditSearchInput} /></span>
                        </div>
                      </td>
                    )}
                    {visibleAuditColumns.studentInfo && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold"><HighlightText text={log.StudentName} highlight={auditSearchInput} /></span>
                          <span className="sub-text">
                            {log.RollNo ? <>Roll: <HighlightText text={log.RollNo} highlight={auditSearchInput} /></> : null}
                            {log.RollNo && log.EnrollNo ? ' | ' : null}
                            {log.EnrollNo ? <>Enroll: <HighlightText text={log.EnrollNo} highlight={auditSearchInput} /></> : null}
                            {!log.RollNo && !log.EnrollNo ? `Student ID: ${log.StudentId}` : null}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleAuditColumns.fieldName && (
                      <td>
                        <code className="apaar-code"><HighlightText text={log.FieldName} highlight={auditSearchInput} /></code>
                      </td>
                    )}
                    {visibleAuditColumns.diffValue && (
                      <td>
                        <div className="flex-align" style={{ gap: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#dc2626', textDecoration: 'line-through', fontFamily: 'monospace', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                            <HighlightText text={log.OldValue || 'N/A'} highlight={auditSearchInput} />
                          </span>
                          <span style={{ color: '#64748b', fontWeight: 'bold' }}>➔</span>
                          <span style={{ color: '#047857', fontWeight: '700', fontFamily: 'monospace', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                            <HighlightText text={log.NewValue || 'N/A'} highlight={auditSearchInput} />
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleAuditColumns.remarks && (
                      <td>
                        <span className="sub-text" style={{ fontStyle: 'italic', color: '#334155' }}>
                          <HighlightText text={log.Remarks || 'N/A'} highlight={auditSearchInput} />
                        </span>
                      </td>
                    )}
                    {visibleAuditColumns.timestamp && (
                      <td>
                        <span className="sub-text" style={{ fontWeight: '500' }}>{log.UpdatedAt}</span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* API-based Pagination Bar Footer (Identical Layout to Students & Payments) */}
        <div className="pagination-card-footer">
          <div className="pagination-info">
            <span className="pagination-text">
              Showing {auditTotalCount > 0 ? (auditPage - 1) * auditPageSize + 1 : 0} to {Math.min(auditPage * auditPageSize, auditTotalCount)} of {auditTotalCount} entries
            </span>

            <div className="rows-per-page-selector mt-2">
              <label>Rows per page:</label>
              <select
                value={auditPageSize}
                onChange={(e) => {
                  setAuditPageSize(Number(e.target.value));
                  setAuditPage(1);
                }}
                className="rows-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Show All (All Records)</option>
              </select>
            </div>
          </div>

          <div className="pagination-controls">
            <button
              onClick={() => setAuditPage(1)}
              disabled={auditPage === 1 || auditLoading}
              className="page-btn"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              onClick={() => setAuditPage(p => Math.max(p - 1, 1))}
              disabled={auditPage === 1 || auditLoading}
              className="page-btn"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, auditTotalPages) }, (_, i) => {
              let pageNum;
              if (auditTotalPages <= 5) {
                pageNum = i + 1;
              } else if (auditPage <= 3) {
                pageNum = i + 1;
              } else if (auditPage >= auditTotalPages - 2) {
                pageNum = auditTotalPages - 4 + i;
              } else {
                pageNum = auditPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setAuditPage(pageNum)}
                  className={`page-btn ${auditPage === pageNum ? 'active' : ''}`}
                  disabled={auditLoading}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setAuditPage(p => Math.min(p + 1, auditTotalPages))}
              disabled={auditPage >= auditTotalPages || auditLoading}
              className="page-btn"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setAuditPage(auditTotalPages)}
              disabled={auditPage >= auditTotalPages || auditLoading}
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