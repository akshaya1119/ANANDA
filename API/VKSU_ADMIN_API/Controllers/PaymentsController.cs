using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VKSU_ADMIN_API.Data;

namespace VKSU_ADMIN_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PaymentsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Gets a paginated, searchable, filterable, and sortable list of payment records joined with student details.
        /// Supports SHOW ALL option when pageSize is <= 0 or >= 99999.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetPayments(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? courseName = null,
            [FromQuery] string? semester = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? sortBy = "createdat",
            [FromQuery] string? sortOrder = "desc")
        {
            try
            {
                if (page < 1) page = 1;

                // Left join Payments with Students table
                var query = from p in _context.Payments.AsNoTracking()
                            join s in _context.Students.AsNoTracking() on p.StudentId equals s.Id into studentGroup
                            from s in studentGroup.DefaultIfEmpty()
                            select new
                            {
                                Id = p.Id,
                                StudentId = p.StudentId,
                                StudentName = s != null ? s.NAME : "N/A",
                                RollNo = s != null ? (long?)s.ROLLNO : null,
                                EnrollNo = s != null ? (long?)s.ENROLL_NO : null,
                                CourseName = s != null ? s.COURSE_NAME : "N/A",
                                CollegeName = s != null ? s.COLLEGE_NAME : "N/A",
                                Amount = p.Amount,
                                Currency = p.Currency ?? "INR",
                                Status = p.Status ?? "initiated",
                                UserStatus = p.UserStatus ?? "",
                                PayuOrderId = p.PayuOrderId ?? "",
                                PayuPaymentId = p.PayuPaymentId ?? "",
                                Semester = p.Semester ?? (s != null ? s.SEMESTER : ""),
                                CreatedAt = p.CreatedAt,
                                CompletedAt = p.CompletedAt,
                                Remarks = p.UserStatus ?? ""
                            };

                // Search by Student Name, Roll No, Enroll No, Txn ID, Order ID, Payment ID, Status
                if (!string.IsNullOrWhiteSpace(search))
                {
                    string term = search.Trim().ToLower();
                    query = query.Where(x =>
                        (x.StudentName != null && x.StudentName.ToLower().Contains(term)) ||
                        (x.RollNo != null && x.RollNo.ToString().Contains(term)) ||
                        (x.EnrollNo != null && x.EnrollNo.ToString().Contains(term)) ||
                        (x.PayuOrderId != null && x.PayuOrderId.ToLower().Contains(term)) ||
                        (x.PayuPaymentId != null && x.PayuPaymentId.ToLower().Contains(term)) ||
                        (x.Status != null && x.Status.ToLower().Contains(term))
                    );
                }

                // Filter by Status
                if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
                {
                    string st = status.Trim().ToLower();
                    if (st == "captured" || st == "success")
                    {
                        query = query.Where(x => x.Status.ToLower() == "captured" || x.Status.ToLower() == "success");
                    }
                    else
                    {
                        query = query.Where(x => x.Status.ToLower() == st);
                    }
                }

                // Filter by Course
                if (!string.IsNullOrWhiteSpace(courseName) && courseName != "ALL")
                {
                    query = query.Where(x => x.CourseName.ToLower() == courseName.ToLower());
                }

                // Filter by Semester
                if (!string.IsNullOrWhiteSpace(semester) && semester != "ALL")
                {
                    query = query.Where(x => x.Semester.ToLower() == semester.ToLower());
                }

                // Filter by Date Range (Date Wise Payment)
                if (startDate.HasValue)
                {
                    query = query.Where(x => x.CreatedAt >= startDate.Value.Date);
                }
                if (endDate.HasValue)
                {
                    DateTime toDate = endDate.Value.Date.AddDays(1).AddTicks(-1);
                    query = query.Where(x => x.CreatedAt <= toDate);
                }

                // Sorting
                bool isAsc = (sortOrder ?? "desc").ToLower() == "asc";
                switch ((sortBy ?? "createdat").ToLower())
                {
                    case "studentname":
                    case "name":
                        query = isAsc ? query.OrderBy(x => x.StudentName) : query.OrderByDescending(x => x.StudentName);
                        break;
                    case "rollno":
                        query = isAsc ? query.OrderBy(x => x.RollNo) : query.OrderByDescending(x => x.RollNo);
                        break;
                    case "amount":
                        query = isAsc ? query.OrderBy(x => x.Amount) : query.OrderByDescending(x => x.Amount);
                        break;
                    case "status":
                        query = isAsc ? query.OrderBy(x => x.Status) : query.OrderByDescending(x => x.Status);
                        break;
                    case "payuorderid":
                    case "txnid":
                        query = isAsc ? query.OrderBy(x => x.PayuOrderId) : query.OrderByDescending(x => x.PayuOrderId);
                        break;
                    case "createdat":
                    case "date":
                    default:
                        query = isAsc ? query.OrderBy(x => x.CreatedAt) : query.OrderByDescending(x => x.CreatedAt);
                        break;
                }

                int totalCount = await query.CountAsync();

                // Compute Statistics
                var allStatuses = await _context.Payments.AsNoTracking().Select(p => new { p.Status, p.Amount }).ToListAsync();
                decimal totalAmount = allStatuses.Sum(p => p.Amount);
                int capturedCount = allStatuses.Count(p => (p.Status ?? "").Equals("captured", StringComparison.OrdinalIgnoreCase) || (p.Status ?? "").Equals("success", StringComparison.OrdinalIgnoreCase));
                decimal capturedAmount = allStatuses.Where(p => (p.Status ?? "").Equals("captured", StringComparison.OrdinalIgnoreCase) || (p.Status ?? "").Equals("success", StringComparison.OrdinalIgnoreCase)).Sum(p => p.Amount);
                int withdrawCount = allStatuses.Count(p => (p.Status ?? "").Equals("withdraw", StringComparison.OrdinalIgnoreCase) || (p.Status ?? "").Equals("withdrawn", StringComparison.OrdinalIgnoreCase));
                int initiatedCount = allStatuses.Count(p => (p.Status ?? "").Equals("initiated", StringComparison.OrdinalIgnoreCase));
                int failedCount = allStatuses.Count(p => (p.Status ?? "").Equals("failed", StringComparison.OrdinalIgnoreCase) || (p.Status ?? "").Equals("cancelled", StringComparison.OrdinalIgnoreCase));

                // SHOW ALL Support (if pageSize <= 0 or >= 99999)
                bool showAll = pageSize <= 0 || pageSize >= 99999;
                int effectivePageSize = showAll ? (totalCount > 0 ? totalCount : 1) : pageSize;
                int totalPages = showAll ? 1 : (int)Math.Ceiling((double)totalCount / effectivePageSize);

                var items = showAll 
                    ? await query.ToListAsync() 
                    : await query.Skip((page - 1) * effectivePageSize).Take(effectivePageSize).ToListAsync();

                return Ok(new
                {
                    items,
                    totalCount,
                    page = showAll ? 1 : page,
                    pageSize = effectivePageSize,
                    totalPages,
                    stats = new
                    {
                        totalPayments = allStatuses.Count,
                        totalAmount,
                        capturedCount,
                        capturedAmount,
                        withdrawCount,
                        initiatedCount,
                        failedCount,
                        successRate = allStatuses.Count > 0 ? Math.Round((double)capturedCount / allStatuses.Count * 100, 1) : 0
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving payment records.", Error = ex.Message });
            }
        }
    }
}
