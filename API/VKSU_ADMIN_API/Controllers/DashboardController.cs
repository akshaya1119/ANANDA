using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VKSU_ADMIN_API.Data;
using VKSU_ADMIN_API.Models;

namespace VKSU_ADMIN_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Enforce JWT auth
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                var totalStudents = _context.Students.Count();
                var verifiedAadhar = _context.Students.Count(s => s.AADHARVALIDATION == true);
                var pendingAadhar = totalStudents - verifiedAadhar;
                var totalRevenue = _context.Payments
                    .Where(p => p.Status.ToLower() == "captured" || p.Status.ToLower() == "success" || p.Status.ToLower() == "completed")
                    .Sum(p => (double?)p.Amount) ?? 0.0;

                var totalPaymentsCount = _context.Payments.Count();
                var successPaymentsCount = _context.Payments.Count(p => p.Status.ToLower() == "captured" || p.Status.ToLower() == "success" || p.Status.ToLower() == "completed");
                
                double successRate = totalPaymentsCount > 0 
                    ? Math.Round(((double)successPaymentsCount / totalPaymentsCount) * 100, 2) 
                    : 100.0;

                return Ok(new
                {
                    TotalStudents = totalStudents,
                    VerifiedAadhar = verifiedAadhar,
                    PendingAadhar = pendingAadhar,
                    TotalRevenue = totalRevenue,
                    SuccessRate = successRate
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving dashboard statistics.", Error = ex.Message });
            }
        }

        [HttpGet("recent-payments")]
        public IActionResult GetRecentPayments()
        {
            try
            {
                var payments = _context.Payments
                    .OrderByDescending(p => p.CreatedAt)
                    .Take(10)
                    .ToList();

                var studentIds = payments.Select(p => p.StudentId).Distinct().ToList();
                var students = _context.Students
                    .Where(s => studentIds.Contains(s.Id))
                    .ToDictionary(s => s.Id, s => s.NAME);

                var result = payments.Select(p => new
                {
                    p.Id,
                    p.StudentId,
                    StudentName = students.ContainsKey(p.StudentId) ? students[p.StudentId] : "Unknown Student",
                    p.Amount,
                    p.Currency,
                    p.Status,
                    p.UserStatus,
                    p.PayuOrderId,
                    p.PayuPaymentId,
                    p.Semester,
                    CreatedAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving recent payments.", Error = ex.Message });
            }
        }

        [HttpGet("recent-students")]
        public IActionResult GetRecentStudents()
        {
            try
            {
                var students = _context.Students
                    .OrderByDescending(s => s.Id)
                    .Take(10)
                    .Select(s => new
                    {
                        s.Id,
                        s.ROLLNO,
                        s.ENROLL_NO,
                        s.NAME,
                        s.COURSE_NAME,
                        s.SEMESTER,
                        s.AADHAR,
                        s.AADHARVALIDATION,
                        s.APAARID,
                        s.PAYMENT_STATUS
                    })
                    .ToList();

                return Ok(students);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving recent students.", Error = ex.Message });
            }
        }
    }
}
