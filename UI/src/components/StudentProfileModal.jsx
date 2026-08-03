import React, { useState, useEffect } from 'react';
import {
  X, User, Calendar, BookOpen, Award, MapPin,
  Mail, Phone, ShieldCheck, CreditCard, Save, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, History, Clock
} from 'lucide-react';

export default function StudentProfileModal({ student, user, token, apiBase, onClose, onUpdateSuccess }) {
  const [aadhar, setAadhar] = useState(student.AADHAR ? student.AADHAR.toString() : '');
  const [apaarId, setApaarId] = useState(student.APAARID || '');
  const [mobile, setMobile] = useState(student.MOBILE ? student.MOBILE.toString() : '');
  const [email, setEmail] = useState(student.EMAIL_ID || '');
  const [dob, setDob] = useState(student.DOB || '');
  const [category, setCategory] = useState(student.CATEGORY || '');
  const [aadharValidation, setAadharValidation] = useState(student.AADHARVALIDATION ?? false);
  const [paymentStatus, setPaymentStatus] = useState(student.PAYMENT_STATUS ? (student.PAYMENT_STATUS.toUpperCase() === 'CAPTURED' ? 'PAID' : student.PAYMENT_STATUS.toUpperCase()) : 'INITIATED');
  const [remarks, setRemarks] = useState(student.REMARKS || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [photoError, setPhotoError] = useState(false);
  const [signError, setSignError] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [dbStatus, setDbStatus] = useState(student.PAYMENT_STATUS ? student.PAYMENT_STATUS.toUpperCase() : '');
  const isWithdrawn = dbStatus === 'WITHDRAW' || dbStatus === 'WITHDRAWN';

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [hasPaidFee, setHasPaidFee] = useState(
    student.HasPaidFee ??
    ((student.PAYMENT_STATUS || '').toUpperCase() === 'SUCCESS' || (student.PAYMENT_STATUS || '').toUpperCase() === 'CAPTURED' || (student.PAYMENT_STATUS || '').toUpperCase() === 'PAID' || (student.PAYMENT_STATUS || '').toUpperCase() === 'WITHDRAW')
  );

  const fetchStudentAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const targetUrl = apiBase || import.meta.env.VITE_API_URL || 'https://anandaexams.com/NEPVIExitAdminAPI/api';
      const res = await fetch(`${targetUrl}/students/audit-logs?studentId=${student.Id}&pageSize=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const logs = data.Logs || data.logs || [];
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error('Error fetching student audit logs:', e);
    } finally {
      setAuditLoading(false);
    }
  };

  // GET API Call on modal load to fetch up-to-date student profile status from database
  useEffect(() => {
    const fetchFreshStudentData = async () => {
      try {
        const res = await fetch(`${apiBase}/students/${student.Id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.HasPaidFee !== undefined) {
            setHasPaidFee(fresh.HasPaidFee);
          }
          if (fresh.PAYMENT_STATUS) {
            setDbStatus(fresh.PAYMENT_STATUS.toUpperCase());
            setPaymentStatus(fresh.PAYMENT_STATUS.toUpperCase());
          }
          if (fresh.EMAIL_ID) setEmail(fresh.EMAIL_ID);
          if (fresh.MOBILE) setMobile(fresh.MOBILE.toString());
          if (fresh.APAARID) setApaarId(fresh.APAARID);
          if (fresh.AADHAR) setAadhar(fresh.AADHAR.toString());
          if (fresh.DOB) setDob(fresh.DOB);
          if (fresh.CATEGORY) setCategory(fresh.CATEGORY);
        }
      } catch (e) {
        console.error('Error fetching fresh student profile:', e);
      }
    };
    fetchFreshStudentData();
    fetchStudentAuditLogs();
  }, [student.Id]);

  const handleSave = async (e, bypassConfirm = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage({ type: '', text: '' });

    const payload = {};
    const changes = [];

    // 1. MOBILE: Check if modified
    const initialMobile = student.MOBILE ? student.MOBILE.toString() : 'Not Set';
    if (mobile.trim() !== (student.MOBILE ? student.MOBILE.toString() : '')) {
      const cleanMobile = mobile.trim();
      if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
        setMessage({ type: 'error', text: `New mobile number must be exactly 10 digits (currently ${cleanMobile.length} digits).` });
        return;
      }
      if (cleanMobile) {
        payload.MOBILE = parseInt(cleanMobile, 10);
        changes.push({ field: 'Mobile Number', oldVal: initialMobile, newVal: cleanMobile });
      }
    }

    // 2. AADHAAR: Check if modified
    const initialAadhar = student.AADHAR ? student.AADHAR.toString() : 'Not Set';
    if (aadhar.trim() !== (student.AADHAR ? student.AADHAR.toString() : '')) {
      const cleanAadhar = aadhar.trim();
      if (cleanAadhar && !/^\d{12}$/.test(cleanAadhar)) {
        setMessage({ type: 'error', text: `New Aadhaar ID must be exactly 12 digits (currently ${cleanAadhar.length} digits).` });
        return;
      }
      if (cleanAadhar) {
        payload.AADHAR = parseInt(cleanAadhar, 10);
        changes.push({ field: 'Aadhaar ID', oldVal: initialAadhar, newVal: cleanAadhar });
      }
    }

    // 3. APAAR ID: Check if modified
    const initialApaar = student.APAARID || 'Not Set';
    if (apaarId.trim() !== (student.APAARID || '')) {
      const cleanApaar = apaarId.trim();
      if (cleanApaar && !/^[a-zA-Z0-9]{12}$/.test(cleanApaar)) {
        setMessage({ type: 'error', text: `New APAAR ID must be 12 alphanumeric characters (currently ${cleanApaar.length} chars).` });
        return;
      }
      if (cleanApaar) {
        payload.APAARID = cleanApaar;
        changes.push({ field: 'APAAR ID', oldVal: initialApaar, newVal: cleanApaar });
      }
    }

    // 4. EMAIL: Check if modified
    const initialEmail = student.EMAIL_ID || 'Not Set';
    if (email.trim() !== (student.EMAIL_ID || '')) {
      const cleanEmail = email.trim();
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setMessage({ type: 'error', text: 'Please enter a valid email address.' });
        return;
      }
      if (cleanEmail) {
        payload.EMAIL_ID = cleanEmail;
        changes.push({ field: 'Registered Email', oldVal: initialEmail, newVal: cleanEmail });
      }
    }

    // 5. DOB: Check if modified
    const initialDob = student.DOB || 'Not Set';
    if (dob.trim() !== (student.DOB || '')) {
      const cleanDob = dob.trim();
      if (cleanDob && !/^\d{2}-\d{2}-\d{4}$/.test(cleanDob)) {
        setMessage({ type: 'error', text: 'Date of Birth must be in DD-MM-YYYY format (e.g. 15-08-2002).' });
        return;
      }
      if (cleanDob) {
        payload.DOB = cleanDob;
        changes.push({ field: 'Date of Birth', oldVal: initialDob, newVal: cleanDob });
      }
    }

    // 6. CATEGORY: Check if modified
    const initialCategory = student.CATEGORY || 'Not Set';
    if (category.trim() !== (student.CATEGORY || '')) {
      const cleanCategory = category.trim().toUpperCase();
      if (cleanCategory) {
        payload.CATEGORY = cleanCategory;
        changes.push({ field: 'Category', oldVal: initialCategory, newVal: cleanCategory });
      }
    }

    // 5. AADHAR VALIDATION: Check if modified
    const initialVal = student.AADHARVALIDATION ?? false;
    if (aadharValidation !== initialVal) {
      payload.AADHARVALIDATION = aadharValidation;
      changes.push({
        field: 'Aadhaar Status',
        oldVal: initialVal ? 'Verified' : 'Pending',
        newVal: aadharValidation ? 'Verified' : 'Pending'
      });
    }

    // 6. PAYMENT STATUS & REMARKS: Check if modified
    const initialPaymentStatus = (dbStatus || student.PAYMENT_STATUS || 'INITIATED').toUpperCase();
    if (paymentStatus !== initialPaymentStatus) {
      payload.PAYMENT_STATUS = paymentStatus;
      changes.push({ field: 'Payment Status', oldVal: initialPaymentStatus, newVal: paymentStatus });
    }

    const cleanRemarks = remarks.trim();
    if (paymentStatus === 'WITHDRAW' && !cleanRemarks) {
      setMessage({ type: 'error', text: 'Remarks / withdrawal reason is required when setting Payment Status to WITHDRAW.' });
      return;
    }

    if (cleanRemarks) {
      payload.Remarks = cleanRemarks;
    }

    // If no field was modified by admin
    if (Object.keys(payload).length === 0) {
      setMessage({ type: 'error', text: 'No changes detected to update.' });
      return;
    }

    if (paymentStatus === 'WITHDRAW' && !bypassConfirm) {
      setShowConfirmModal(true);
      return;
    }

    executePatchPayload(payload, changes);
  };

  const executePatchPayload = async (payload, changes) => {
    setSaving(true);

    try {
      payload.AdminUserId = user?.UserId || 'USR1001';
      payload.AdminUserName = user?.FullName || user?.UserName || 'Admin User';

      const targetUrl = apiBase || import.meta.env.VITE_API_URL || 'https://anandaexams.com/NEPVIExitAdminAPI/api';
      const res = await fetch(`${targetUrl}/students/${student.Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.Message || 'Failed to update student profile.');
      }

      setMessage({
        type: 'success',
        title: 'Student Profile Updated Successfully!',
        changes: changes
      });

      if (onUpdateSuccess) {
        onUpdateSuccess({
          ...student,
          ...payload
        });
      }

      if (payload.PAYMENT_STATUS) {
        setDbStatus(payload.PAYMENT_STATUS.toUpperCase());
      }

      fetchStudentAuditLogs();

    } catch (err) {
      console.error('Error updating student profile:', err);
      setMessage({ type: 'error', text: err.message || 'Error updating student record.' });
    } finally {
      setSaving(false);
    }
  };

  const renderMessageToast = () => {
    if (!message.text && !message.changes) return null;

    if (message.text) {
      return (
        <div className={`toast-alert ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      );
    }

    if (message.changes) {
      return (
        <div className="toast-alert success detailed-toast">
          <div className="toast-header">
            <CheckCircle2 size={18} />
            <span>{message.title}</span>
          </div>
          <ul className="toast-changes-list">
            {message.changes.map((ch, idx) => (
              <li key={idx}>
                <span className="change-field">{ch.field}:</span>
                <span className="old-value">{ch.oldVal}</span>
                <span className="arrow-icon">➔</span>
                <span className="new-value">{ch.newVal}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  };

  const initialLetter = student.NAME ? student.NAME[0].toUpperCase() : 'S';

  return (
    <div className="modal-backdrop">
      <div className="profile-modal-card">
        {/* Top Header Banner */}
        <div className="profile-header-banner">
          <div className="banner-user-group">
            <div className="avatar-circle">
              {initialLetter}
            </div>
            <div className="banner-title-area">
              <h2 className="banner-name">{student.NAME}</h2>
              <p className="banner-subtitle">
                {student.COURSE_NAME} (SEM {student.SEMESTER}) {student.MAJOR_SUBJECT ? `| Major: ${student.MAJOR_SUBJECT}` : ''}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-close-modal" title="Close Profile">
            <X size={22} />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="profile-modal-body">
          {renderMessageToast()}

          <div className="profile-grid">
            {/* LEFT COLUMN: STUDENT PROFILE DETAILS */}
            <div className="profile-main-card">
              <div className="card-section-title">
                <User size={18} />
                <span>STUDENT PROFILE DETAILS</span>
              </div>

              {/* Immutable Readonly Details Grid */}
              <div className="details-readonly-grid">
                <div className="detail-item">
                  <label className="detail-label">ROLL NUMBER</label>
                  <div className="detail-value highlight-code"># {student.ROLLNO}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">ENROLLMENT NUMBER</label>
                  <div className="detail-value font-mono">{student.ENROLL_NO}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">FATHER'S NAME</label>
                  <div className="detail-value">{student.FNAME || 'N/A'}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">MOTHER'S NAME</label>
                  <div className="detail-value">{student.MNAME || 'N/A'}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">DATE OF BIRTH</label>
                  <div className="detail-value flex-align">
                    <Calendar size={14} className="text-icon" />
                    <span>{student.DOB || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">GENDER / CATEGORY</label>
                  <div className="detail-value">{student.GENDER || 'N/A'} / {student.CATEGORY || 'UR'}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">ENROLLED COURSE</label>
                  <div className="detail-value flex-align">
                    <BookOpen size={14} className="text-icon" />
                    <span>{student.COURSE_NAME} (Sem {student.SEMESTER})</span>
                  </div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">MAJOR SUBJECT / ACADEMIC CGPA</label>
                  <div className="detail-value flex-align">
                    <Award size={14} className="text-icon" />
                    <span>{student.MAJOR_SUBJECT || 'General'} / <strong>{student.CGPA}</strong></span>
                  </div>
                </div>

                <div className="detail-item col-span-2">
                  <label className="detail-label">COLLEGE</label>
                  <div className="detail-value flex-align">
                    <MapPin size={14} className="text-icon red" />
                    <span>{student.COLLEGE_NAME || 'HARPRASAD DAS JAIN COLLEGE, ARA'} {student.COLLEGE_ID ? `(ID: ${student.COLLEGE_ID})` : ''}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">SESSION</label>
                  <div className="detail-value">{student.SESSION || 'N/A'}</div>
                </div>

                <div className="detail-item">
                  <label className="detail-label">PAYMENT STATUS</label>
                  <div className="detail-value">
                    {(() => {
                      const st = (dbStatus || student.PAYMENT_STATUS || 'INITIATED').toUpperCase();
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
                  </div>
                </div>
              </div>

              <hr className="profile-divider" />

              {/* EDITABLE ADMIN PATCH FIELDS */}
              <div className="editable-section">
                <h4 className="editable-title">EDITABLE ADMIN FIELDS</h4>

                {isWithdrawn && (
                  <div className="error-alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      LOCKED PROFILE: Student payment status is WITHDRAW. Further edits and modifications are permanently locked.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSave} className="editable-form-grid">

                  <div className="form-field">
                    <label className="field-label">REGISTERED EMAIL</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" />
                      <input
                        type="email"
                        value={email}
                        disabled={isWithdrawn}
                        onChange={(e) => setEmail(e.target.value)}
                        className="editable-input"
                        placeholder="Registered Email"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">REGISTERED MOBILE</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon" />
                      <input
                        type="text"
                        value={mobile}
                        maxLength={10}
                        disabled={isWithdrawn}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        className="editable-input"
                        placeholder="10-digit Mobile Number"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">APAAR ID</label>
                    <div className="input-with-icon">
                      <ShieldCheck size={16} className="input-icon" />
                      <input
                        type="text"
                        value={apaarId}
                        maxLength={12}
                        disabled={isWithdrawn}
                        onChange={(e) => setApaarId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                        className="editable-input"
                        placeholder="12-char Alphanumeric APAAR ID"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">AADHAAR ID</label>
                    <div className="input-with-icon">
                      <CreditCard size={16} className="input-icon" />
                      <input
                        type="text"
                        value={aadhar}
                        maxLength={12}
                        disabled={isWithdrawn}
                        onChange={(e) => setAadhar(e.target.value.replace(/\D/g, ''))}
                        className="editable-input"
                        placeholder="12-digit Aadhaar Number"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">DATE OF BIRTH (DD-MM-YYYY)</label>
                    <div className="input-with-icon">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="text"
                        value={dob}
                        maxLength={10}
                        disabled={isWithdrawn}
                        onChange={(e) => setDob(e.target.value.replace(/\//g, '-').replace(/[^0-9-]/g, ''))}
                        className="editable-input"
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">CATEGORY</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" />
                      <select
                        value={category}
                        disabled={isWithdrawn}
                        onChange={(e) => setCategory(e.target.value)}
                        className="editable-input"
                        style={{ cursor: isWithdrawn ? 'not-allowed' : 'pointer' }}
                      >
                        <option value="">Select Category</option>
                        {['UR', 'BC-1', 'BC-2', 'SC', 'ST', 'EWS'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {category && !['UR', 'BC-1', 'BC-2', 'SC', 'ST', 'EWS'].includes(category) && (
                          <option value={category}>{category}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="form-field col-span-2">
                    <label className="field-label">PAYMENT STATUS ACTION</label>
                    <div className="validation-toggle-group">
                      {!hasPaidFee ? (
                        <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                          <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#eab308' }} />
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#334155' }}>FEE NOT PAID YET &mdash; CANNOT WITHDRAW</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Only candidates with captured/successful fee payment can be withdrawn.</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isWithdrawn}
                          onClick={() => setPaymentStatus(paymentStatus === 'WITHDRAW' ? (student.PAYMENT_STATUS?.toUpperCase() || 'SUCCESS') : 'WITHDRAW')}
                          className={`toggle-btn ${paymentStatus === 'WITHDRAW' ? 'active' : ''}`}
                          style={{
                            width: '100%',
                            justify: 'center',
                            background: paymentStatus === 'WITHDRAW' ? '#dc2626' : '#f1f5f9',
                            color: paymentStatus === 'WITHDRAW' ? '#ffffff' : '#475569',
                            borderColor: paymentStatus === 'WITHDRAW' ? '#dc2626' : '#cbd5e1',
                            fontWeight: '600',
                            padding: '10px 16px',
                            opacity: isWithdrawn ? 0.7 : 1,
                            cursor: isWithdrawn ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <X size={16} />
                          <span>{paymentStatus === 'WITHDRAW' ? 'PAYMENT STATUS: WITHDRAW' : 'MARK / SET PAYMENT STATUS TO WITHDRAW'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-field col-span-2">
                    <label className="field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>STUDENT REMARKS {paymentStatus === 'WITHDRAW' && <span style={{ color: '#dc2626' }}>*</span>}</span>
                      {paymentStatus === 'WITHDRAW' ? (
                        <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'bold' }}>(REMARKS REQUIRED FOR WITHDRAWAL)</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>(OPTIONAL)</span>
                      )}
                    </label>
                    <div className="input-with-icon">
                      <FileText size={16} className="input-icon" />
                      <input
                        type="text"
                        value={remarks}
                        disabled={isWithdrawn}
                        onChange={(e) => setRemarks(e.target.value)}
                        required={paymentStatus === 'WITHDRAW'}
                        className="editable-input"
                        placeholder={paymentStatus === 'WITHDRAW' ? "e.g. Student requested fee refund / withdrawal via helpline" : "Optional student remarks / notes"}
                      />
                    </div>
                  </div>

                  <div className="form-action-row col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {renderMessageToast()}

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || isWithdrawn}
                      className="btn-proceed-red"
                      style={{
                        width: '100%',
                        opacity: (saving || isWithdrawn) ? 0.6 : 1,
                        cursor: (saving || isWithdrawn) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {saving ? (
                        <span className="spinner-wrapper">
                          <span className="spinner"></span> Saving Changes...
                        </span>
                      ) : isWithdrawn ? (
                        <span>LOCKED &mdash; PROFILE WITHDRAWN</span>
                      ) : (
                        <span>PROCEED / SAVE CHANGES</span>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: AWS S3 PHOTOGRAPH & SIGNATURE */}
            <div className="profile-side-panel">
              {/* Photograph Card */}
              <div className="media-card">
                <div className="media-header">
                  <User size={16} />
                  <span>PHOTOGRAPH</span>
                </div>
                <div className="media-body photo-box">
                  {!photoError && student.PHOTO_URL ? (
                    <img
                      src={student.PHOTO_URL}
                      alt={`${student.NAME} Photograph`}
                      onError={() => setPhotoError(true)}
                      className="student-photo-img"
                    />
                  ) : (
                    <div className="media-placeholder">
                      <User size={64} className="placeholder-icon" />
                      <span>Photo Not Available</span>
                    </div>
                  )}
                </div>
                <div className="media-footer">
                  <span>Official Registration Photograph</span>
                </div>
              </div>

              {/* Signature Card */}
              <div className="media-card">
                <div className="media-header">
                  <ImageIcon size={16} />
                  <span>SIGNATURE</span>
                </div>
                <div className="media-body sign-box">
                  {!signError && student.SIGN_URL ? (
                    <img
                      src={student.SIGN_URL}
                      alt={`${student.NAME} Signature`}
                      onError={() => setSignError(true)}
                      className="student-sign-img"
                    />
                  ) : (
                    <div className="media-placeholder signature">
                      <span className="sample-sign-font">{student.NAME}</span>
                    </div>
                  )}
                </div>
                <div className="media-footer">
                  <span>Registered Signature</span>
                </div>
              </div>

              {/* AUDIT LOG STATUS CARD (Below Signature Box) */}
              <div className="media-card" style={{ marginTop: '16px', border: auditLogs.length > 0 ? '1px solid #cbd5e1' : '1px solid #e2e8f0' }}>
                <div className="media-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: auditLogs.length > 0 ? '#f8fafc' : '#ffffff', padding: '10px 14px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} style={{ color: auditLogs.length > 0 ? '#4f46e5' : '#94a3b8' }} />
                    <span style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a', letterSpacing: '0.3px' }}>AUDIT & EDIT HISTORY</span>
                  </div>
                  {auditLogs.length > 0 ? (
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      Previously Audited ({auditLogs.length})
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b' }}>
                      Original Record
                    </span>
                  )}
                </div>

                <div className="media-body" style={{ padding: '12px', background: '#ffffff', minHeight: 'auto' }}>
                  {auditLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0', fontSize: '12px', color: '#64748b' }}>
                      <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      <span>Checking audit logs...</span>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '10px 4px', color: '#64748b', fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>No Prior Edits</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>This student record has not been modified by any admin.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', width: '100%', paddingRight: '2px' }}>
                      {auditLogs.map((log) => (
                        <div key={log.Id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <code style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: '700' }}>
                              {log.FieldName}
                            </code>
                            <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {log.UpdatedAt}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', fontFamily: 'monospace', fontSize: '11.5px' }}>
                            <span style={{ color: '#dc2626', textDecoration: 'line-through', background: '#fef2f2', padding: '1px 5px', borderRadius: '3px', wordBreak: 'break-all' }}>
                              {log.OldValue || 'N/A'}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>➔</span>
                            <span style={{ color: '#047857', fontWeight: '700', background: '#ecfdf5', padding: '1px 5px', borderRadius: '3px', wordBreak: 'break-all' }}>
                              {log.NewValue || 'N/A'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569' }}>
                            <span>By: <strong>{log.AdminUserName || log.AdminUserId || 'Admin'}</strong></span>
                            {log.Remarks && (
                              <span style={{ fontStyle: 'italic', color: '#334155', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.Remarks}>
                                "{log.Remarks}"
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* IRREVERSIBLE WITHDRAWAL CONFIRMATION MODAL OVERLAY */}
      {showConfirmModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ maxWidth: '460px', padding: '24px', textAlign: 'center', borderTop: '4px solid #dc2626', background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertCircle size={32} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              Confirm Student Withdrawal?
            </h3>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '20px' }}>
              This withdrawal process is <strong style={{ color: '#dc2626' }}>IRREVERSIBLE</strong>. Once marked as <strong>WITHDRAW</strong>, this student profile and all associated payment records will be permanently locked and further profile edits will be disabled.
            </p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', textAlign: 'left', marginBottom: '20px', fontSize: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>Student: {student.NAME} (ID: {student.Id})</div>
              <div style={{ color: '#475569' }}>Reason: "{remarks.trim()}"</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={(e) => {
                  setShowConfirmModal(false);
                  handleSave(e, true);
                }}
                className="btn-proceed-red"
                style={{ flex: 1, padding: '10px 16px', background: '#dc2626', borderColor: '#dc2626', color: '#ffffff', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                Yes, Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
