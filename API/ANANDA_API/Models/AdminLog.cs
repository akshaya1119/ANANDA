using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ANANDA_API.Models
{
    [Table("AdminLogs")]
    public class AdminLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public string? AdminUserId { get; set; }

        [Required]
        public string AdminUserName { get; set; } = string.Empty;

        [Required]
        public int StudentId { get; set; }

        [Required]
        public string StudentName { get; set; } = string.Empty;

        [Required]
        public string FieldName { get; set; } = string.Empty;

        public string? OldValue { get; set; }

        public string? NewValue { get; set; }

        public string? Remarks { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

      

        [ForeignKey("AdminUserId")]
        public virtual Users? AdminUser { get; set; }
    }
}
