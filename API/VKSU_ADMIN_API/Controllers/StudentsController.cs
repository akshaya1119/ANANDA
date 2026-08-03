using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VKSU_ADMIN_API.Data;
using VKSU_ADMIN_API.Models;

namespace VKSU_ADMIN_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Enforce JWT Auth
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Gets a paginated, searchable, and filterable list of students.
        /// Search matches ENROLL_NO or ROLLNO (or NAME).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? courseName = null,
            [FromQuery] string? semester = null,
            [FromQuery] bool? aadharValidation = null,
            [FromQuery] string? session = null,
            [FromQuery] string? sortBy = "id",
            [FromQuery] string? sortOrder = "desc")
        {
            try
            {
                if (page < 1) page = 1;

                var query = _context.Students.AsNoTracking().AsQueryable();

                // API-based Search by Enroll No or Roll No (or Student Name / Mobile / Email)
                if (!string.IsNullOrWhiteSpace(search))
                {
                    string term = search.Trim().ToLower();
                    query = query.Where(s => 
                        s.ENROLL_NO.ToString().Contains(term) ||
                        s.ROLLNO.ToString().Contains(term) ||
                        (s.NAME != null && s.NAME.ToLower().Contains(term)) ||
                        (s.EMAIL_ID != null && s.EMAIL_ID.ToLower().Contains(term)) ||
                        (s.MOBILE != null && s.MOBILE.ToString().Contains(term))
                    );
                }

                // Filter by Course Name
                if (!string.IsNullOrWhiteSpace(courseName) && courseName != "ALL")
                {
                    query = query.Where(s => s.COURSE_NAME.ToLower() == courseName.ToLower());
                }

                // Filter by Semester
                if (!string.IsNullOrWhiteSpace(semester) && semester != "ALL")
                {
                    query = query.Where(s => s.SEMESTER.ToLower() == semester.ToLower());
                }

                // Filter by Session
                if (!string.IsNullOrWhiteSpace(session) && session != "ALL")
                {
                    query = query.Where(s => s.SESSION.ToLower() == session.ToLower());
                }

                // Filter by Aadhar Validation status
                if (aadharValidation.HasValue)
                {
                    if (aadharValidation.Value)
                        query = query.Where(s => s.AADHARVALIDATION == true);
                    else
                        query = query.Where(s => s.AADHARVALIDATION == false || s.AADHARVALIDATION == null);
                }

                // Sorting
                bool isAsc = (sortOrder ?? "desc").ToLower() == "asc";
                switch ((sortBy ?? "id").ToLower())
                {
                    case "name":
                    case "studentname":
                        query = isAsc ? query.OrderBy(s => s.NAME) : query.OrderByDescending(s => s.NAME);
                        break;
                    case "rollno":
                        query = isAsc ? query.OrderBy(s => s.ROLLNO) : query.OrderByDescending(s => s.ROLLNO);
                        break;
                    case "enrollno":
                        query = isAsc ? query.OrderBy(s => s.ENROLL_NO) : query.OrderByDescending(s => s.ENROLL_NO);
                        break;
                    case "fee":
                        query = isAsc ? query.OrderBy(s => s.FEE) : query.OrderByDescending(s => s.FEE);
                        break;
                    case "payment_status":
                    case "paymentstatus":
                        query = isAsc ? query.OrderBy(s => s.PAYMENT_STATUS) : query.OrderByDescending(s => s.PAYMENT_STATUS);
                        break;
                    case "semester":
                        query = isAsc ? query.OrderBy(s => s.SEMESTER) : query.OrderByDescending(s => s.SEMESTER);
                        break;
                    case "course":
                        query = isAsc ? query.OrderBy(s => s.COURSE_NAME) : query.OrderByDescending(s => s.COURSE_NAME);
                        break;
                    default:
                        query = isAsc ? query.OrderBy(s => s.Id) : query.OrderByDescending(s => s.Id);
                        break;
                }

                int totalCount = await query.CountAsync();

                // SHOW ALL Support (if pageSize <= 0 or >= 99999)
                bool showAll = pageSize <= 0 || pageSize >= 99999;
                int effectivePageSize = showAll ? (totalCount > 0 ? totalCount : 1) : pageSize;
                int totalPages = showAll ? 1 : (int)Math.Ceiling((double)totalCount / effectivePageSize);

                List<Students> items;
                if (showAll)
                {
                    items = await query.ToListAsync();
                }
                else
                {
                    items = await query.Skip((page - 1) * effectivePageSize).Take(effectivePageSize).ToListAsync();
                }

                // Resolve PAYMENT_STATUS from Payments table for each returned student
                if (items.Any())
                {
                    var studentIds = items.Select(s => s.Id).ToList();
                    var enrollNos = items.Where(s => s.ENROLL_NO > 0).Select(s => (int)s.ENROLL_NO).ToList();

                    var paymentsList = await _context.Payments
                        .AsNoTracking()
                        .Where(p => studentIds.Contains(p.StudentId) || enrollNos.Contains(p.StudentId))
                        .OrderByDescending(p => p.Id)
                        .ToListAsync();

                    foreach (var s in items)
                    {
                        var latestPayment = paymentsList.FirstOrDefault(p => p.StudentId == s.Id || (s.ENROLL_NO > 0 && p.StudentId == (int)s.ENROLL_NO));
                        s.PAYMENT_STATUS = ResolvePaymentStatus(s.PAYMENT_STATUS, latestPayment?.Status);
                    }
                }

                return Ok(new
                {
                    items,
                    totalCount,
                    page = showAll ? 1 : page,
                    pageSize = effectivePageSize,
                    totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving student records.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Gets available filter options for frontend dropdowns (Courses, Semesters, Sessions).
        /// </summary>
        [HttpGet("filter-options")]
        public async Task<IActionResult> GetFilterOptions()
        {
            try
            {
                var courses = await _context.Students
                    .Where(s => s.COURSE_NAME != null)
                    .Select(s => s.COURSE_NAME)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToListAsync();

                var semesters = await _context.Students
                    .Where(s => s.SEMESTER != null)
                    .Select(s => s.SEMESTER)
                    .Distinct()
                    .OrderBy(s => s)
                    .ToListAsync();

                var sessions = await _context.Students
                    .Where(s => s.SESSION != null)
                    .Select(s => s.SESSION)
                    .Distinct()
                    .OrderBy(s => s)
                    .ToListAsync();

                return Ok(new
                {
                    courses,
                    semesters,
                    sessions
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving filter options.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Returns all matching students for Excel export based on current search & filters.
        /// </summary>
        [HttpGet("export")]
        public async Task<IActionResult> ExportStudents(
            [FromQuery] string? search = null,
            [FromQuery] string? courseName = null,
            [FromQuery] string? semester = null,
            [FromQuery] bool? aadharValidation = null,
            [FromQuery] string? session = null)
        {
            try
            {
                var query = _context.Students.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    string term = search.Trim().ToLower();
                    query = query.Where(s => 
                        s.ENROLL_NO.ToString().Contains(term) ||
                        s.ROLLNO.ToString().Contains(term) ||
                        (s.NAME != null && s.NAME.ToLower().Contains(term))
                    );
                }

                if (!string.IsNullOrWhiteSpace(courseName) && courseName != "ALL")
                {
                    query = query.Where(s => s.COURSE_NAME.ToLower() == courseName.ToLower());
                }

                if (!string.IsNullOrWhiteSpace(semester) && semester != "ALL")
                {
                    query = query.Where(s => s.SEMESTER.ToLower() == semester.ToLower());
                }

                if (!string.IsNullOrWhiteSpace(session) && session != "ALL")
                {
                    query = query.Where(s => s.SESSION.ToLower() == session.ToLower());
                }

                if (aadharValidation.HasValue)
                {
                    if (aadharValidation.Value)
                        query = query.Where(s => s.AADHARVALIDATION == true);
                    else
                        query = query.Where(s => s.AADHARVALIDATION == false || s.AADHARVALIDATION == null);
                }

                var students = await query.OrderByDescending(s => s.Id).ToListAsync();

                return Ok(students);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error generating export data.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a single student's details by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetStudentById(int id)
        {
            try
            {
                var student = await _context.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
                if (student == null)
                {
                    return NotFound(new { Message = $"Student with ID {id} not found." });
                }

                var latestPayment = await _context.Payments
                    .AsNoTracking()
                    .Where(p => p.StudentId == student.Id || (student.ENROLL_NO > 0 && p.StudentId == (int)student.ENROLL_NO))
                    .OrderByDescending(p => p.Id)
                    .FirstOrDefaultAsync();

                string resolvedStatus = ResolvePaymentStatus(student.PAYMENT_STATUS, latestPayment?.Status);

                bool hasPaidFee = (resolvedStatus.Equals("PAID", StringComparison.OrdinalIgnoreCase) ||
                                   resolvedStatus.Equals("CAPTURED", StringComparison.OrdinalIgnoreCase) ||
                                   resolvedStatus.Equals("SUCCESS", StringComparison.OrdinalIgnoreCase) ||
                                   resolvedStatus.Equals("WITHDRAW", StringComparison.OrdinalIgnoreCase) ||
                                   resolvedStatus.Equals("WITHDRAWN", StringComparison.OrdinalIgnoreCase));

                return Ok(new
                {
                    student.Id,
                    student.ENROLL_NO,
                    student.ROLLNO,
                    student.NAME,
                    student.FNAME,
                    student.MNAME,
                    student.GENDER,
                    student.CATEGORY,
                    student.DOB,
                    student.MOBILE,
                    student.EMAIL_ID,
                    student.AADHAR,
                    student.AADHARVALIDATION,
                    student.APAARID,
                    student.COURSE_NAME,
                    student.SEMESTER,
                    student.SESSION,
                    student.COLLEGE_NAME,
                    student.COLLEGE_ID,
                    student.MAJOR_SUBJECT,
                    student.CGPA,
                    student.FEE,
                    PAYMENT_STATUS = resolvedStatus,
                    HasPaidFee = hasPaidFee
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving student details.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Updates/patches editable student fields: AADHAAR, APAARID, MOBILE, EMAIL_ID, AADHARVALIDATION.
        /// </summary>
        [HttpPatch("{id:int}")]
        public async Task<IActionResult> UpdateStudentProfile(int id, [FromBody] UpdateStudentRequest dto)
        {
            try
            {
                var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == id);
                if (student == null)
                {
                    return NotFound(new { Message = $"Student with ID {id} not found." });
                }

                // Prevent any modifications if profile is already WITHDRAWN
                if ((student.PAYMENT_STATUS ?? string.Empty).Equals("WITHDRAW", StringComparison.OrdinalIgnoreCase) || 
                    (student.PAYMENT_STATUS ?? string.Empty).Equals("WITHDRAWN", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { Message = "This student profile is WITHDRAWN. Further updates are locked." });
                }

                string adminUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? dto.AdminUserId ?? "USR1001";
                string adminUserName = User.FindFirst(ClaimTypes.Name)?.Value ?? dto.AdminUserName ?? User.Identity?.Name ?? "Admin User";
                string remarks = dto.Remarks?.Trim() ?? string.Empty;

                bool hasChanges = false;

                // 0. Validate and patch PAYMENT_STATUS and update Payments table status
                if (!string.IsNullOrWhiteSpace(dto.PAYMENT_STATUS))
                {
                    string newPaymentStatus = dto.PAYMENT_STATUS.Trim().ToUpper();

                    if (newPaymentStatus == "WITHDRAW" || newPaymentStatus == "WITHDRAWN")
                    {
                        if (string.IsNullOrWhiteSpace(remarks))
                        {
                            return BadRequest(new { Message = "Remarks / withdrawal reason is required when setting Payment Status to WITHDRAW." });
                        }

                        // Validate captured fee payment status
                        bool isCapturedPayment = await _context.Payments.AnyAsync(p => 
                            (p.StudentId == student.Id || (student.ENROLL_NO > 0 && p.StudentId == (int)student.ENROLL_NO)) &&
                            (p.Status.ToLower() == "captured" || p.Status.ToLower() == "success" || p.Status.ToLower() == "completed" || p.Status.ToLower() == "paid" || p.Status.ToLower() == "withdraw")
                        );
                        bool hasPaid = isCapturedPayment || (student.PAYMENT_STATUS != null && (
                            student.PAYMENT_STATUS.Equals("SUCCESS", StringComparison.OrdinalIgnoreCase) ||
                            student.PAYMENT_STATUS.Equals("CAPTURED", StringComparison.OrdinalIgnoreCase) ||
                            student.PAYMENT_STATUS.Equals("PAID", StringComparison.OrdinalIgnoreCase)
                        ));

                        if (!hasPaid)
                        {
                            return BadRequest(new { Message = "Cannot withdraw student profile. Fee payment has not been captured for this candidate yet." });
                        }

                        // Patch or Insert matching records in Payments table to WITHDRAW
                        var studentPayments = await _context.Payments
                            .Where(p => p.StudentId == student.Id || (student.ENROLL_NO > 0 && p.StudentId == (int)student.ENROLL_NO))
                            .ToListAsync();

                        if (studentPayments.Any())
                        {
                            foreach (var payment in studentPayments)
                            {
                                payment.Status = "WITHDRAW";
                                payment.UserStatus = remarks;
                            }
                        }
                        else
                        {
                            // Create a new record in Payments table if none existed
                            _context.Payments.Add(new Payment
                            {
                                StudentId = student.Id,
                                Amount = (decimal)(student.FEE > 0 ? student.FEE : 0),
                                Currency = "INR",
                                Status = "WITHDRAW",
                                UserStatus = remarks,
                                PayuOrderId = $"WITHDRAW_{student.Id}_{DateTime.UtcNow:yyyyMMddHHmmss}",
                                PayuPaymentId = $"ADMIN_WITHDRAW_{student.Id}",
                                Semester = student.SEMESTER ?? "Sem 1",
                                CreatedAt = DateTime.UtcNow,
                                CompletedAt = DateTime.UtcNow
                            });
                        }
                        hasChanges = true;
                    }

                    if (newPaymentStatus != (student.PAYMENT_STATUS ?? string.Empty).ToUpper())
                    {
                        _context.AdminLogs.Add(new AdminLog
                        {
                            AdminUserId = adminUserId,
                            AdminUserName = adminUserName,
                            StudentId = student.Id,
                            StudentName = student.NAME,
                            FieldName = "PAYMENT_STATUS",
                            OldValue = student.PAYMENT_STATUS ?? "INITIATED",
                            NewValue = newPaymentStatus,
                            Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                            UpdatedAt = DateTime.UtcNow
                        });

                        student.PAYMENT_STATUS = newPaymentStatus;
                        hasChanges = true;
                    }
                }

                // 1. Validate and patch AADHAR (must be 12 digits)
                if (dto.AADHAR.HasValue && dto.AADHAR.Value > 0 && dto.AADHAR.Value != student.AADHAR)
                {
                    string aadharStr = dto.AADHAR.Value.ToString();
                    if (aadharStr.Length != 12)
                    {
                        return BadRequest(new { Message = "Aadhaar ID must be exactly 12 digits." });
                    }

                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "AADHAR",
                        OldValue = student.AADHAR.ToString(),
                        NewValue = dto.AADHAR.Value.ToString(),
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.AADHAR = dto.AADHAR.Value;
                    hasChanges = true;
                }

                // 2. Validate and patch APAAR ID (12 alphanumeric characters)
                if (!string.IsNullOrWhiteSpace(dto.APAARID) && dto.APAARID.Trim() != (student.APAARID ?? string.Empty))
                {
                    string apaar = dto.APAARID.Trim();
                    if (apaar.Length != 12 || !apaar.All(char.IsLetterOrDigit))
                    {
                        return BadRequest(new { Message = "APAAR ID must be exactly 12 alphanumeric characters." });
                    }

                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "APAARID",
                        OldValue = student.APAARID ?? "Not Set",
                        NewValue = apaar,
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.APAARID = apaar;
                    hasChanges = true;
                }

                // 3. Validate and patch MOBILE (10 digits)
                if (dto.MOBILE.HasValue && dto.MOBILE.Value > 0 && dto.MOBILE.Value != student.MOBILE)
                {
                    string mobStr = dto.MOBILE.Value.ToString();
                    if (mobStr.Length != 10)
                    {
                        return BadRequest(new { Message = "Mobile number must be exactly 10 digits." });
                    }

                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "MOBILE",
                        OldValue = student.MOBILE.ToString(),
                        NewValue = dto.MOBILE.Value.ToString(),
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.MOBILE = dto.MOBILE.Value;
                    hasChanges = true;
                }

                // 4. Validate and patch EMAIL_ID
                if (!string.IsNullOrWhiteSpace(dto.EMAIL_ID) && dto.EMAIL_ID.Trim() != (student.EMAIL_ID ?? string.Empty))
                {
                    string email = dto.EMAIL_ID.Trim();

                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "EMAIL_ID",
                        OldValue = student.EMAIL_ID ?? "Not Set",
                        NewValue = email,
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.EMAIL_ID = email;
                    hasChanges = true;
                }

                // 5. Validate and patch DOB (must be DD-MM-YYYY)
                if (!string.IsNullOrWhiteSpace(dto.DOB) && dto.DOB.Trim() != (student.DOB ?? string.Empty))
                {
                    string newDob = dto.DOB.Trim();
                    if (!System.Text.RegularExpressions.Regex.IsMatch(newDob, @"^\d{2}-\d{2}-\d{4}$"))
                    {
                        return BadRequest(new { Message = "Date of Birth must be in DD-MM-YYYY format (e.g. 15-08-2002)." });
                    }

                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "DOB",
                        OldValue = student.DOB ?? "Not Set",
                        NewValue = newDob,
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.DOB = newDob;
                    hasChanges = true;
                }

                // 6. Validate and patch CATEGORY
                if (!string.IsNullOrWhiteSpace(dto.CATEGORY) && dto.CATEGORY.Trim() != (student.CATEGORY ?? string.Empty))
                {
                    string newCategory = dto.CATEGORY.Trim().ToUpper();
                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "CATEGORY",
                        OldValue = student.CATEGORY ?? "Not Set",
                        NewValue = newCategory,
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.CATEGORY = newCategory;
                    hasChanges = true;
                }

                // 5. Validate and patch AADHARVALIDATION
                if (dto.AADHARVALIDATION.HasValue && dto.AADHARVALIDATION.Value != (student.AADHARVALIDATION ?? false))
                {
                    _context.AdminLogs.Add(new AdminLog
                    {
                        AdminUserId = adminUserId,
                        AdminUserName = adminUserName,
                        StudentId = student.Id,
                        StudentName = student.NAME,
                        FieldName = "AADHARVALIDATION",
                        OldValue = (student.AADHARVALIDATION == true) ? "Verified" : "Pending",
                        NewValue = (dto.AADHARVALIDATION.Value == true) ? "Verified" : "Pending",
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        UpdatedAt = DateTime.UtcNow
                    });

                    student.AADHARVALIDATION = dto.AADHARVALIDATION.Value;
                    hasChanges = true;
                }

                if (hasChanges)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new { Message = "Student profile updated successfully.", student });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error updating student profile.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Gets paginated admin audit logs with search (Name, Roll No, Enroll No, Admin), field filters, admin user filter, sorting & pagination.
        /// </summary>
        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20, 
            [FromQuery] int? studentId = null,
            [FromQuery] string? search = null,
            [FromQuery] string? fieldName = null,
            [FromQuery] string? adminUserId = null,
            [FromQuery] string? adminUser = null,
            [FromQuery] string? sortBy = "updatedat",
            [FromQuery] string? sortOrder = "desc")
        {
            try
            {
                if (page < 1) page = 1;

                var baseQuery = from l in _context.AdminLogs.AsNoTracking()
                                join s in _context.Students.AsNoTracking() on l.StudentId equals s.Id into studentGroup
                                from s in studentGroup.DefaultIfEmpty()
                                select new
                                {
                                    l.Id,
                                    l.AdminUserId,
                                    l.AdminUserName,
                                    l.StudentId,
                                    StudentName = l.StudentName ?? (s != null ? s.NAME : "N/A"),
                                    RollNo = s != null ? (long?)s.ROLLNO : null,
                                    EnrollNo = s != null ? (long?)s.ENROLL_NO : null,
                                    l.FieldName,
                                    l.OldValue,
                                    l.NewValue,
                                    l.Remarks,
                                    l.UpdatedAt
                                };

                if (studentId.HasValue && studentId.Value > 0)
                {
                    baseQuery = baseQuery.Where(l => l.StudentId == studentId.Value);
                }

                // Filter by specific Admin User (by UserId or UserName)
                string? targetAdmin = !string.IsNullOrWhiteSpace(adminUserId) ? adminUserId : adminUser;
                if (!string.IsNullOrWhiteSpace(targetAdmin) && targetAdmin != "ALL")
                {
                    string adminTerm = targetAdmin.Trim().ToLower();
                    baseQuery = baseQuery.Where(l => 
                        (l.AdminUserId != null && l.AdminUserId.ToLower() == adminTerm) ||
                        (l.AdminUserName != null && l.AdminUserName.ToLower() == adminTerm)
                    );
                }

                // Search by Student Name, Roll No, Enroll No, Admin Name, Admin ID, Field Name, Remarks
                if (!string.IsNullOrWhiteSpace(search))
                {
                    string term = search.Trim().ToLower();
                    baseQuery = baseQuery.Where(l =>
                        (l.StudentName != null && l.StudentName.ToLower().Contains(term)) ||
                        (l.RollNo != null && l.RollNo.ToString().Contains(term)) ||
                        (l.EnrollNo != null && l.EnrollNo.ToString().Contains(term)) ||
                        (l.AdminUserName != null && l.AdminUserName.ToLower().Contains(term)) ||
                        (l.AdminUserId != null && l.AdminUserId.ToLower().Contains(term)) ||
                        (l.FieldName != null && l.FieldName.ToLower().Contains(term)) ||
                        (l.Remarks != null && l.Remarks.ToLower().Contains(term))
                    );
                }

                // Filter by Field Name
                if (!string.IsNullOrWhiteSpace(fieldName) && fieldName != "ALL")
                {
                    baseQuery = baseQuery.Where(l => l.FieldName.ToLower() == fieldName.ToLower());
                }

                // Sorting
                bool isAsc = (sortOrder ?? "desc").ToLower() == "asc";
                switch ((sortBy ?? "updatedat").ToLower())
                {
                    case "studentname":
                        baseQuery = isAsc ? baseQuery.OrderBy(l => l.StudentName) : baseQuery.OrderByDescending(l => l.StudentName);
                        break;
                    case "rollno":
                        baseQuery = isAsc ? baseQuery.OrderBy(l => l.RollNo) : baseQuery.OrderByDescending(l => l.RollNo);
                        break;
                    case "adminname":
                        baseQuery = isAsc ? baseQuery.OrderBy(l => l.AdminUserName) : baseQuery.OrderByDescending(l => l.AdminUserName);
                        break;
                    case "fieldname":
                        baseQuery = isAsc ? baseQuery.OrderBy(l => l.FieldName) : baseQuery.OrderByDescending(l => l.FieldName);
                        break;
                    default:
                        baseQuery = isAsc ? baseQuery.OrderBy(l => l.UpdatedAt) : baseQuery.OrderByDescending(l => l.UpdatedAt);
                        break;
                }

                int totalCount = await baseQuery.CountAsync();

                // SHOW ALL support
                bool showAll = pageSize <= 0 || pageSize >= 99999;
                int effectivePageSize = showAll ? (totalCount > 0 ? totalCount : 1) : pageSize;
                int totalPages = showAll ? 1 : (int)Math.Ceiling((double)totalCount / effectivePageSize);

                var items = await (showAll
                    ? baseQuery.ToListAsync()
                    : baseQuery.Skip((page - 1) * effectivePageSize).Take(effectivePageSize).ToListAsync());

                var formattedLogs = items.Select(l => new
                {
                    l.Id,
                    l.AdminUserId,
                    l.AdminUserName,
                    l.StudentId,
                    l.StudentName,
                    l.RollNo,
                    l.EnrollNo,
                    l.FieldName,
                    l.OldValue,
                    l.NewValue,
                    l.Remarks,
                    UpdatedAt = l.UpdatedAt.ToString("dd MMM yyyy, hh:mm tt")
                });

                return Ok(new
                {
                    TotalCount = totalCount,
                    Page = showAll ? 1 : page,
                    PageSize = effectivePageSize,
                    TotalPages = totalPages,
                    Logs = formattedLogs
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error fetching audit logs.", Error = ex.Message });
            }
        }

        /// <summary>
        /// Gets all admin users from Users table & AdminLogs table for the audit filter dropdown.
        /// </summary>
        [HttpGet("audit-admins")]
        [HttpGet("audit-logs/admins")]
        public async Task<IActionResult> GetAuditLogAdmins()
        {
            try
            {
                var usersAdmins = await _context.Users.AsNoTracking()
                    .Select(u => new 
                    { 
                        UserId = u.UserId, 
                        FullName = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : u.UserName, 
                        UserName = u.UserName 
                    })
                    .ToListAsync();

                var logAdmins = await _context.AdminLogs.AsNoTracking()
                    .Select(l => new 
                    { 
                        UserId = l.AdminUserId ?? "USR1001", 
                        FullName = l.AdminUserName, 
                        UserName = l.AdminUserName 
                    })
                    .Distinct()
                    .ToListAsync();

                var merged = usersAdmins.Concat(logAdmins)
                    .Where(a => !string.IsNullOrWhiteSpace(a.UserId))
                    .GroupBy(a => a.UserId.Trim().ToLower())
                    .Select(g => g.First())
                    .OrderBy(a => a.FullName)
                    .ToList();

                return Ok(merged);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving admin list.", Error = ex.Message });
            }
        }
        private static string ResolvePaymentStatus(string? studentStatus, string? paymentTableStatus)
        {
            if (!string.IsNullOrWhiteSpace(studentStatus) && 
                (studentStatus.Equals("WITHDRAW", StringComparison.OrdinalIgnoreCase) || studentStatus.Equals("WITHDRAWN", StringComparison.OrdinalIgnoreCase)))
            {
                return "WITHDRAW";
            }

            if (!string.IsNullOrWhiteSpace(paymentTableStatus))
            {
                string pLower = paymentTableStatus.Trim().ToLower();
                if (pLower == "captured" || pLower == "success" || pLower == "paid" || pLower == "completed") return "PAID";
                if (pLower == "failed") return "FAILED";
                if (pLower == "initiated" || pLower == "pending") return "INITIATED";
                if (pLower == "cancelled") return "CANCELLED";
                if (pLower == "withdraw" || pLower == "withdrawn") return "WITHDRAW";
                return pLower.ToUpper();
            }

            if (!string.IsNullOrWhiteSpace(studentStatus))
            {
                string sLower = studentStatus.Trim().ToLower();
                if (sLower == "captured" || sLower == "success" || sLower == "paid" || sLower == "completed") return "PAID";
                if (sLower == "failed") return "FAILED";
                if (sLower == "initiated" || sLower == "pending") return "INITIATED";
                if (sLower == "cancelled") return "CANCELLED";
                if (sLower == "withdraw" || sLower == "withdrawn") return "WITHDRAW";
                return sLower.ToUpper();
            }

            return "INITIATED";
        }
    }

    public class UpdateStudentRequest
    {
        public long? AADHAR { get; set; }
        public string? APAARID { get; set; }
        public long? MOBILE { get; set; }
        public string? EMAIL_ID { get; set; }
        public string? DOB { get; set; }
        public string? CATEGORY { get; set; }
        public bool? AADHARVALIDATION { get; set; }
        public string? PAYMENT_STATUS { get; set; }
        public string? Remarks { get; set; }
        public string? AdminUserId { get; set; }
        public string? AdminUserName { get; set; }
    }
}
