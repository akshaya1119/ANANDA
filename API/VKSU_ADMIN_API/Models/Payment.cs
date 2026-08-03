using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VKSU_ADMIN_API.Models
{
    public class Payment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int StudentId { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "initiated"; // initiated, captured, failed, cancelled
        public string UserStatus { get; set; } = "Payment initiated";

        public string PayuOrderId { get; set; } = string.Empty; // txnid
        public string PayuPaymentId { get; set; } = string.Empty; // mihpayid

        public string Semester { get; set; } = string.Empty; // Semester being exited from

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}
