import React, { useState, useEffect } from 'react';
import {
  Search, Sliders, FileSpreadsheet, Edit3, ArrowUpDown, ArrowUp, ArrowDown, X,
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

export default function Students({ API_BASE, token, user, filterOptions, onLogout }) {
  // STUDENT DIRECTORY STATES (API-based Pagination, Search & Filters)
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

  // Fetch Student Directory from Backend API
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

      if (res.status === 401 && onLogout) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setStudentList(data.items || data.Items || []);
        setStudentTotalCount(data.totalCount || data.TotalCount || 0);
        setStudentTotalPages(data.totalPages || data.TotalPages || 1);
      } else {
        throw new Error(data.Message || 'Failed to fetch student directory');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setStudentLoading(false);
    }
  };

  // Trigger Student Directory fetch on filter / search / page / sort change
  useEffect(() => {
    fetchDirectoryStudents();
  }, [studentPage, studentPageSize, selectedCourse, selectedSemester, selectedSession, selectedAadharStatus, studentSortBy, studentSortOrder]);

  // Handle Search Input Change (Debounced API fetch)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectoryStudents();
    }, 400);
    return () => clearTimeout(timer);
  }, [studentSearch]);

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

  const handleClearFilters = () => {
    setStudentSearch('');
    setSelectedCourse('ALL');
    setSelectedSemester('ALL');
    setSelectedSession('ALL');
    setSelectedAadharStatus('ALL');
    setStudentPage(1);
  };

  // Download / Export to Excel (.csv)
  const handleExportExcel = () => {
    if (!studentList || studentList.length === 0) {
      alert('No student records currently in table to export.');
      return;
    }

    setExporting(true);
    try {
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

  const hasActiveFilters = studentSearch || selectedCourse !== 'ALL' || selectedSemester !== 'ALL' || selectedSession !== 'ALL' || selectedAadharStatus !== 'ALL';

  return (
    <div className="directory-container">
      {/* Single Responsive Toolbar Row */}
      <div className="directory-header-card" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px 18px', background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        {/* 1. Search Bar Input */}
        <div className="search-bar-wrapper" style={{ flex: '1 1 260px', minWidth: '220px', margin: 0 }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Enroll No, Roll Number, or Student Name..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setStudentPage(1);
            }}
            className="search-input"
          />
        </div>

        {/* 2. Inline Filter Dropdowns */}
        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Course:</span>
          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setStudentPage(1); }}
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
            value={selectedSemester}
            onChange={(e) => { setSelectedSemester(e.target.value); setStudentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Semesters</option>
            {(filterOptions?.semesters || []).map(sem => (
              <option key={sem} value={sem}>Sem {sem}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Session:</span>
          <select
            value={selectedSession}
            onChange={(e) => { setSelectedSession(e.target.value); setStudentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Sessions</option>
            {(filterOptions?.sessions || []).map(ses => (
              <option key={ses} value={ses}>{ses}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="filter-label" style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Aadhaar:</span>
          <select
            value={selectedAadharStatus}
            onChange={(e) => { setSelectedAadharStatus(e.target.value); setStudentPage(1); }}
            className="filter-select"
            style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="btn-clear-filters" style={{ padding: '7px 12px', fontSize: '12.5px' }}>
            <X size={14} />
            <span>Clear</span>
          </button>
        )}

        {/* 3. Action Controls */}
        <div className="toolbar-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Column Toggle Dropdown Button */}
          <div className="column-toggle-container" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="btn-clear-filters"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ffffff' }}
            >
              <Sliders size={15} />
              <span>Columns ({Object.values(visibleColumns).filter(Boolean).length}/{columnList.length})</span>
            </button>

            {showColumnToggle && (
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
                    onClick={() => setShowColumnToggle(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {columnList.map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: '#4f46e5', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = {};
                      columnList.forEach(c => allOn[c.key] = true);
                      setVisibleColumns(allOn);
                    }}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#4f46e5', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const resetObj = {};
                      columnList.forEach(c => resetObj[c.key] = true);
                      setVisibleColumns(resetObj);
                    }}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exporting || studentTotalCount === 0}
            className="btn-export"
            style={{ padding: '8px 14px' }}
            title="Download to Excel (.csv)"
          >
            <FileSpreadsheet size={15} />
            <span>{exporting ? 'Exporting...' : 'Download Excel'}</span>
          </button>
        </div>
      </div>

      {/* Table Card with Scroll Container & Sticky Header */}
      <div className="dashboard-table-card full">
        <div className="table-scroll-container">
          <table className="custom-table">
            <thead>
              <tr>
                {visibleColumns.rollNo && (
                  <th onClick={() => handleStudentSort('rollno')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Roll No / Enroll No</span>
                      {studentSortBy === 'rollno' ? (studentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleColumns.studentName && (
                  <th onClick={() => handleStudentSort('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Student Name</span>
                      {studentSortBy === 'name' ? (studentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleColumns.course && (
                  <th onClick={() => handleStudentSort('course')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Course & Sem</span>
                      {studentSortBy === 'course' ? (studentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleColumns.session && <th>Session</th>}
                {visibleColumns.mobileEmail && <th>Registered Contact</th>}
                {visibleColumns.aadhar && <th>Aadhaar Number</th>}
                {visibleColumns.aadharStatus && <th>Aadhaar Status</th>}
                {visibleColumns.paymentStatus && (
                  <th onClick={() => handleStudentSort('payment_status')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Payment Status</span>
                      {studentSortBy === 'payment_status' ? (studentSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={12} opacity={0.5} />}
                    </div>
                  </th>
                )}
                {visibleColumns.apaarId && <th>APAAR ID</th>}
                {visibleColumns.actions && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {studentLoading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="empty-row">
                    <div className="spinner-wrapper" style={{ justifyContent: 'center' }}>
                      <div className="spinner"></div>
                      <span>Loading student records...</span>
                    </div>
                  </td>
                </tr>
              ) : studentList.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="empty-row">No matching student records found.</td>
                </tr>
              ) : (
                studentList.map(s => (
                  <tr key={s.Id}>
                    {visibleColumns.rollNo && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold">Roll: <HighlightText text={s.ROLLNO} highlight={studentSearch} /></span>
                          <span className="sub-text">Enroll: <HighlightText text={s.ENROLL_NO} highlight={studentSearch} /></span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.studentName && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold"><HighlightText text={s.NAME} highlight={studentSearch} /></span>
                          {s.FNAME && <span className="sub-text">S/O: <HighlightText text={s.FNAME} highlight={studentSearch} /></span>}
                        </div>
                      </td>
                    )}
                    {visibleColumns.course && <td><HighlightText text={s.COURSE_NAME} highlight={studentSearch} /> (Sem <HighlightText text={s.SEMESTER} highlight={studentSearch} />)</td>}
                    {visibleColumns.session && <td><span className="sub-text"><HighlightText text={s.SESSION || 'N/A'} highlight={studentSearch} /></span></td>}
                    {visibleColumns.mobileEmail && (
                      <td>
                        <div className="table-user-cell">
                          <span className="font-semibold"><HighlightText text={s.MOBILE || 'N/A'} highlight={studentSearch} /></span>
                          {s.EMAIL_ID && <span className="sub-text"><HighlightText text={s.EMAIL_ID} highlight={studentSearch} /></span>}
                        </div>
                      </td>
                    )}
                    {visibleColumns.aadhar && <td><HighlightText text={s.AADHAR} highlight={studentSearch} /></td>}
                    {visibleColumns.aadharStatus && (
                      <td>
                        <span className={`verification-badge ${s.AADHARVALIDATION ? 'verified' : 'unverified'}`}>
                          {s.AADHARVALIDATION ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.paymentStatus && (
                      <td>
                        {(() => {
                          const st = (s.PAYMENT_STATUS || 'INITIATED').toUpperCase();
                          if (st === 'CAPTURED' || st === 'SUCCESS' || st === 'PAID') {
                            return <span className="status-pill paid">PAID</span>;
                          }
                          if (st === 'FAILED') {
                            return <span className="status-pill failed">FAILED</span>;
                          }
                          if (st === 'CANCELLED') {
                            return <span className="status-pill cancelled">CANCELLED</span>;
                          }
                          if (st === 'WITHDRAW' || st === 'WITHDRAWN') {
                            return <span className="status-pill withdraw">WITHDRAW</span>;
                          }
                          return <span className="status-pill initiated">INITIATED</span>;
                        })()}
                      </td>
                    )}
                    {visibleColumns.apaarId && (
                      <td>
                        <code className="apaar-code"><HighlightText text={s.APAARID || 'Not Generated'} highlight={studentSearch} /></code>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td>
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="btn-edit-student"
                          title="Edit Student Profile"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* API-based Pagination Bar Footer */}
        <div className="pagination-card-footer">
          <div className="pagination-info">
            <span className="pagination-text">
              Showing {studentTotalCount > 0 ? (studentPage - 1) * studentPageSize + 1 : 0} to {Math.min(studentPage * studentPageSize, studentTotalCount)} of {studentTotalCount} entries
            </span>

            {/* Rows per page selector */}
            <div className="rows-per-page-selector mt-2">
              <label>Rows per page:</label>
              <select
                value={studentPageSize}
                onChange={(e) => {
                  setStudentPageSize(Number(e.target.value));
                  setStudentPage(1);
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

          {/* Pagination Buttons */}
          <div className="pagination-controls">
            <button
              onClick={() => setStudentPage(1)}
              disabled={studentPage === 1 || studentLoading}
              className="page-btn"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              onClick={() => setStudentPage(p => Math.max(p - 1, 1))}
              disabled={studentPage === 1 || studentLoading}
              className="page-btn"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: Math.min(5, studentTotalPages) }, (_, i) => {
              let pageNum;
              if (studentTotalPages <= 5) {
                pageNum = i + 1;
              } else if (studentPage <= 3) {
                pageNum = i + 1;
              } else if (studentPage >= studentTotalPages - 2) {
                pageNum = studentTotalPages - 4 + i;
              } else {
                pageNum = studentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setStudentPage(pageNum)}
                  className={`page-btn ${studentPage === pageNum ? 'active' : ''}`}
                  disabled={studentLoading}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setStudentPage(p => Math.min(p + 1, studentTotalPages))}
              disabled={studentPage >= studentTotalPages || studentLoading}
              className="page-btn"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setStudentPage(studentTotalPages)}
              disabled={studentPage >= studentTotalPages || studentLoading}
              className="page-btn"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSave={() => {
            fetchDirectoryStudents();
            setSelectedStudent(null);
          }}
          API_BASE={API_BASE}
          token={token}
          user={user}
        />
      )}
    </div>
  );
}